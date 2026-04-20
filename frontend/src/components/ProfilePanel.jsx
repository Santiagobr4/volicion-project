import { useEffect, useRef, useState } from "react";
import {
  fetchProfile,
  getApiErrorMessage,
  requestPasswordResetEmail,
  updateProfile,
} from "../api/auth";
import { getTrackerMetrics, getWeekly } from "../api/habits";
import defaultAvatar from "../assets/default-avatar.svg";
import LoadingSpinner from "./LoadingSpinner";
import { formatPercent } from "../utils/completion";
import { getCurrentWeekStartIsoDate } from "../utils/dateUtils";
import {
  buttonClassName,
  helpTextClassName,
  inputClassName,
  labelClassName,
  modalBackdropClassName,
  modalPanelClassName,
  panelShellClassName,
} from "./ui.js";

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "prefer_not_to_say", label: "Prefiero no decirlo" },
];

const ALLOWED_GENDERS = new Set(GENDER_OPTIONS.map((option) => option.value));

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  birth_date: "",
  weight_kg: "",
  gender: "prefer_not_to_say",
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FIELD_NAMES = [
  "first_name",
  "last_name",
  "email",
  "birth_date",
  "weight_kg",
  "gender",
];

const buildSnapshot = (form, avatarUrl) => ({
  form: {
    first_name: form.first_name || "",
    last_name: form.last_name || "",
    email: form.email || "",
    birth_date: form.birth_date || "",
    weight_kg:
      form.weight_kg === null || form.weight_kg === undefined
        ? ""
        : String(form.weight_kg),
    gender: ALLOWED_GENDERS.has(form.gender)
      ? form.gender
      : "prefer_not_to_say",
  },
  avatarUrl: avatarUrl || "",
});

/**
 * Profile editor for authenticated users.
 *
 * Props:
 * - onProfileChange(updatedProfile): optional callback to sync profile in parent shell.
 */
export default function ProfilePanel({ onProfileChange }) {
  const [form, setForm] = useState(initialForm);
  const [savedSnapshot, setSavedSnapshot] = useState(
    buildSnapshot(initialForm, ""),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successVisible, setSuccessVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [persistedAvatarPreview, setPersistedAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [hasCustomAvatar, setHasCustomAvatar] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState("");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState("");
  const [profileSummary, setProfileSummary] = useState({
    streakCurrent: null,
    averageCompletion: null,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const fileInputRef = useRef(null);

  const validateField = (fieldName, value, formState = form) => {
    const normalizedValue = typeof value === "string" ? value.trim() : value;

    if (fieldName === "email") {
      if (!normalizedValue) {
        return "Ingresa tu correo electrónico.";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedValue)) {
        return "Ingresa un correo válido.";
      }
    }

    if (fieldName === "birth_date" && normalizedValue) {
      const selectedDate = new Date(`${normalizedValue}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        return "La fecha no puede ser futura.";
      }
    }

    if (fieldName === "weight_kg" && normalizedValue !== "") {
      const weight = Number(normalizedValue);
      if (Number.isNaN(weight)) {
        return "Ingresa un número válido.";
      }

      if (weight < 0) {
        return "El peso no puede ser negativo.";
      }
    }

    if (fieldName === "gender") {
      const selectedGender = formState.gender;
      if (!ALLOWED_GENDERS.has(selectedGender)) {
        return "Selecciona una opción válida.";
      }
    }

    return "";
  };

  const validateForm = (formState = form) => {
    const nextErrors = {};

    FIELD_NAMES.forEach((fieldName) => {
      const fieldError = validateField(
        fieldName,
        formState[fieldName],
        formState,
      );
      if (fieldError) {
        nextErrors[fieldName] = fieldError;
      }
    });

    return nextErrors;
  };

  const getVisibleFieldError = (fieldName) => {
    if (!fieldErrors[fieldName]) return "";
    if (submitAttempted || touchedFields[fieldName]) {
      return fieldErrors[fieldName];
    }
    return "";
  };

  const isFieldDirty = (fieldName) =>
    form[fieldName] !== savedSnapshot.form[fieldName];

  const hasFormChanges = FIELD_NAMES.some((fieldName) =>
    isFieldDirty(fieldName),
  );
  const hasAvatarChanges =
    Boolean(avatarFile) ||
    removeAvatar ||
    avatarPreview !== savedSnapshot.avatarUrl;
  const isDirty = hasFormChanges || hasAvatarChanges;

  const updateField = (fieldName, value) => {
    if (success) {
      setSuccess("");
    }

    setForm((prev) => {
      const nextForm = { ...prev, [fieldName]: value };

      if (submitAttempted || touchedFields[fieldName]) {
        const nextError = validateField(fieldName, value, nextForm);
        setFieldErrors((prevErrors) => {
          if (!nextError && !prevErrors[fieldName]) {
            return prevErrors;
          }

          const clonedErrors = { ...prevErrors };
          if (nextError) {
            clonedErrors[fieldName] = nextError;
          } else {
            delete clonedErrors[fieldName];
          }
          return clonedErrors;
        });
      }

      return nextForm;
    });
  };

  const handleFieldBlur = (fieldName) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    const nextError = validateField(fieldName, form[fieldName], form);
    setFieldErrors((prevErrors) => {
      const clonedErrors = { ...prevErrors };
      if (nextError) {
        clonedErrors[fieldName] = nextError;
      } else {
        delete clonedErrors[fieldName];
      }
      return clonedErrors;
    });
  };

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      const weekStart = getCurrentWeekStartIsoDate();

      try {
        if (!isCancelled) {
          setLoading(true);
          setSummaryLoading(true);
          setError("");
        }
        const [profile, trackerMetrics, weekly] = await Promise.allSettled([
          fetchProfile(),
          getTrackerMetrics(weekStart),
          getWeekly(weekStart),
        ]);

        if (profile.status !== "fulfilled") {
          throw profile.reason;
        }

        const profileData = profile.value;
        const metricsData =
          trackerMetrics.status === "fulfilled" ? trackerMetrics.value : null;
        const weeklyData = weekly.status === "fulfilled" ? weekly.value : null;

        const habits = Array.isArray(weeklyData?.habits)
          ? weeklyData.habits
          : [];
        const streakCurrent = habits.reduce(
          (maxStreak, habit) => Math.max(maxStreak, habit?.streak_current || 0),
          0,
        );
        const averageCompletion = metricsData?.week?.completion ?? null;

        const remoteAvatar = profileData.avatar_file_url || "";
        if (!isCancelled) {
          const normalizedForm = {
            first_name: profileData.first_name || "",
            last_name: profileData.last_name || "",
            email: profileData.email || "",
            birth_date: profileData.birth_date || "",
            weight_kg: profileData.weight_kg || "",
            gender: ALLOWED_GENDERS.has(profileData.gender)
              ? profileData.gender
              : "prefer_not_to_say",
          };

          setForm({
            ...normalizedForm,
          });
          setPersistedAvatarPreview(remoteAvatar);
          setAvatarPreview(remoteAvatar);
          setHasCustomAvatar(Boolean(remoteAvatar));
          setSavedSnapshot(buildSnapshot(normalizedForm, remoteAvatar));
          setFieldErrors({});
          setTouchedFields({});
          setSubmitAttempted(false);
          setProfileSummary({
            streakCurrent,
            averageCompletion,
          });
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            getApiErrorMessage(requestError, "No pudimos cargar el perfil."),
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setSummaryLoading(false);
        }
      }
    };
    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  useEffect(() => {
    if (!success) {
      setSuccessVisible(false);
      return;
    }

    setSuccessVisible(true);
    const fadeTimer = setTimeout(() => {
      setSuccessVisible(false);
    }, 3600);
    const clearTimer = setTimeout(() => {
      setSuccess("");
    }, 4200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [success]);

  const saveProfile = async () => {
    // Send multipart only when uploading an avatar file.
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let payload;

      if (avatarFile) {
        const multipart = new FormData();
        multipart.append("first_name", form.first_name || "");
        multipart.append("last_name", form.last_name || "");
        multipart.append("email", form.email || "");
        multipart.append("gender", form.gender || "prefer_not_to_say");
        multipart.append("remove_avatar", "false");

        if (form.birth_date) {
          multipart.append("birth_date", form.birth_date);
        }

        if (form.weight_kg !== "") {
          multipart.append("weight_kg", form.weight_kg);
        }

        multipart.append("avatar", avatarFile);
        payload = multipart;
      } else {
        payload = {
          ...form,
          remove_avatar: removeAvatar,
          weight_kg: form.weight_kg === "" ? null : form.weight_kg,
          birth_date: form.birth_date || null,
        };
      }

      const updatedProfile = await updateProfile(payload);
      const nextAvatar = updatedProfile.avatar_file_url || "";
      const nextForm = {
        first_name: updatedProfile.first_name || "",
        last_name: updatedProfile.last_name || "",
        email: updatedProfile.email || "",
        birth_date: updatedProfile.birth_date || "",
        weight_kg: updatedProfile.weight_kg || "",
        gender: ALLOWED_GENDERS.has(updatedProfile.gender)
          ? updatedProfile.gender
          : "prefer_not_to_say",
      };

      setForm(nextForm);
      setSuccess("Perfil actualizado.");
      setAvatarFile(null);
      setRemoveAvatar(false);
      setPersistedAvatarPreview(nextAvatar);
      setAvatarPreview(nextAvatar);
      setHasCustomAvatar(Boolean(nextAvatar));
      setSavedSnapshot(buildSnapshot(nextForm, nextAvatar));
      setFieldErrors({});
      setTouchedFields({});
      setSubmitAttempted(false);
      onProfileChange?.(updatedProfile);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "No pudimos actualizar el perfil."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saving || !isDirty) return;

    setSubmitAttempted(true);
    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setShowSaveConfirm(true);
  };

  const handlePasswordResetRequest = async () => {
    setSendingResetEmail(true);
    setPasswordResetMessage("");
    setError("");

    try {
      const result = await requestPasswordResetEmail();
      setPasswordResetMessage(
        result?.detail ||
          "Te enviamos un correo para restablecer tu contraseña.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No pudimos enviar el correo de recuperación.",
        ),
      );
    } finally {
      setSendingResetEmail(false);
    }
  };

  if (loading) {
    return (
      <div className={`${panelShellClassName} p-6`}>
        <LoadingSpinner label="Cargando perfil..." />
      </div>
    );
  }

  return (
    <div className={`${panelShellClassName} p-3 sm:p-4 md:p-6`}>
      <div className="mb-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-linear-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-3 sm:p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Perfil
        </p>
        <h2 className="text-xl font-semibold mt-1">Tu perfil</h2>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Racha actual
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {summaryLoading
              ? "..."
              : `${profileSummary.streakCurrent ?? 0} días`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
            Tu mejor racha activa entre hábitos esta semana.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Cumplimiento promedio
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {summaryLoading
              ? "..."
              : formatPercent(profileSummary.averageCompletion)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
            Promedio de avance de la semana en curso.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60">
          <img
            src={avatarPreview || defaultAvatar}
            alt="Perfil"
            className="w-20 h-20 rounded-full object-cover border border-slate-300 dark:border-slate-600"
          />

          <div className="flex-1 w-full min-w-0">
            <p className={helpTextClassName}>JPG, PNG o WEBP. Máximo 2 MB.</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccess("");
                  setPendingPhoto(null);
                  setShowPhotoModal(true);
                }}
                className={
                  buttonClassName({ variant: "secondary", size: "sm" }) +
                  " w-full sm:w-auto"
                }
              >
                Cambiar foto
              </button>

              {avatarFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setAvatarFile(null);
                    if (previewObjectUrl) {
                      URL.revokeObjectURL(previewObjectUrl);
                      setPreviewObjectUrl("");
                    }
                    setAvatarPreview(persistedAvatarPreview);
                  }}
                  className={
                    buttonClassName({ variant: "secondary", size: "sm" }) +
                    " w-full sm:w-auto"
                  }
                >
                  Quitar foto
                </button>
              )}

              {hasCustomAvatar && !avatarFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setAvatarFile(null);
                    setRemoveAvatar(true);
                    setHasCustomAvatar(false);
                    setAvatarPreview("");
                  }}
                  className={
                    buttonClassName({ variant: "danger", size: "sm" }) +
                    " w-full sm:w-auto"
                  }
                >
                  Eliminar foto actual
                </button>
              )}

              {removeAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccess("");
                    setRemoveAvatar(false);
                    setHasCustomAvatar(Boolean(persistedAvatarPreview));
                    setAvatarPreview(persistedAvatarPreview);
                  }}
                  className={
                    buttonClassName({ variant: "secondary", size: "sm" }) +
                    " w-full sm:w-auto"
                  }
                >
                  Deshacer
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Nombre
              {isFieldDirty("first_name") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={(event) =>
                updateField("first_name", event.target.value)
              }
              onBlur={() => handleFieldBlur("first_name")}
              className={`${inputClassName} ${
                isFieldDirty("first_name")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            />
            {getVisibleFieldError("first_name") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("first_name")}
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Apellido
              {isFieldDirty("last_name") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={(event) => updateField("last_name", event.target.value)}
              onBlur={() => handleFieldBlur("last_name")}
              className={`${inputClassName} ${
                isFieldDirty("last_name")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            />
            {getVisibleFieldError("last_name") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("last_name")}
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Correo electrónico
              {isFieldDirty("email") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              onBlur={() => handleFieldBlur("email")}
              className={`${inputClassName} ${
                isFieldDirty("email")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            />
            {getVisibleFieldError("email") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("email")}
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Fecha de nacimiento
              {isFieldDirty("birth_date") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(event) =>
                updateField("birth_date", event.target.value)
              }
              onBlur={() => handleFieldBlur("birth_date")}
              className={`${inputClassName} ${
                isFieldDirty("birth_date")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            />
            {getVisibleFieldError("birth_date") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("birth_date")}
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Peso (kg)
              {isFieldDirty("weight_kg") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.weight_kg}
              onChange={(event) => updateField("weight_kg", event.target.value)}
              onBlur={() => handleFieldBlur("weight_kg")}
              className={`${inputClassName} ${
                isFieldDirty("weight_kg")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            />
            {getVisibleFieldError("weight_kg") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("weight_kg")}
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Género
              {isFieldDirty("gender") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500/80"
                  aria-label="Campo modificado"
                />
              )}
            </label>
            <select
              value={form.gender}
              onChange={(event) => updateField("gender", event.target.value)}
              onBlur={() => handleFieldBlur("gender")}
              className={`${inputClassName} ${
                isFieldDirty("gender")
                  ? "border-sky-400/80 dark:border-sky-500/70"
                  : ""
              }`}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {getVisibleFieldError("gender") && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                {getVisibleFieldError("gender")}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p
            className={`fade-in rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition-opacity duration-500 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 ${
              successVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {success}
          </p>
        )}
        {passwordResetMessage && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {passwordResetMessage}
          </p>
        )}

        <div className="pt-2">
          {isDirty && (
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-300 fade-in">
              Tienes cambios sin guardar.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className={`${buttonClassName({ variant: "primary" })} transition-transform duration-150 hover:-translate-y-0.5 disabled:hover:translate-y-0`}
              aria-busy={saving}
              title={!isDirty && !saving ? "No hay cambios" : undefined}
            >
              {saving ? (
                <>
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-slate-600 dark:border-t-slate-900"
                    aria-hidden="true"
                  />
                  Guardando...
                </>
              ) : (
                "Guardar perfil"
              )}
            </button>
            <button
              type="button"
              disabled={sendingResetEmail}
              onClick={handlePasswordResetRequest}
              className={buttonClassName({ variant: "secondary" })}
              aria-busy={sendingResetEmail}
            >
              {sendingResetEmail
                ? "Enviando correo..."
                : "Restaurar contraseña"}
            </button>
          </div>
        </div>
      </form>

      {showSaveConfirm && (
        <div className={modalBackdropClassName}>
          <div className={`${modalPanelClassName} max-w-sm p-5`}>
            <h3 className="text-lg font-semibold">Confirmar cambios</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
              ¿Guardar cambios?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setShowSaveConfirm(false);
                  await saveProfile();
                }}
                className={buttonClassName({ variant: "primary", size: "sm" })}
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-slate-600 dark:border-t-slate-900"
                      aria-hidden="true"
                    />
                    Guardando...
                  </>
                ) : (
                  "Sí, guardar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className={modalBackdropClassName}>
          <div className={`${modalPanelClassName} max-w-md p-5 sm:p-6`}>
            <h3 className="text-lg font-semibold">Subir foto</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
              Elige una imagen JPG, PNG o WEBP. Máximo 2 MB.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                setError("");
                setSuccess("");
                const file = event.target.files?.[0] || null;
                setPendingPhoto(file);
              }}
            />

            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className={helpTextClassName}>
                {pendingPhoto ? pendingPhoto.name : "Aún no elegiste archivo."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Elegir archivo
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingPhoto(null);
                  setShowPhotoModal(false);
                }}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!pendingPhoto) {
                    setError("Primero elige una imagen.");
                    return;
                  }

                  if (!ALLOWED_IMAGE_TYPES.includes(pendingPhoto.type)) {
                    setError("La imagen debe ser JPG, PNG o WEBP.");
                    return;
                  }

                  if (pendingPhoto.size > MAX_IMAGE_BYTES) {
                    setError("La imagen debe pesar 2 MB o menos.");
                    return;
                  }

                  setAvatarFile(pendingPhoto);
                  setRemoveAvatar(false);
                  setHasCustomAvatar(true);
                  if (previewObjectUrl) {
                    URL.revokeObjectURL(previewObjectUrl);
                  }
                  const url = URL.createObjectURL(pendingPhoto);
                  setPreviewObjectUrl(url);
                  setAvatarPreview(url);
                  setPendingPhoto(null);
                  setShowPhotoModal(false);
                  setSuccess("");
                }}
                className={buttonClassName({ variant: "primary", size: "sm" })}
              >
                Usar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
