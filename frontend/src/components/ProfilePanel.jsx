import { useEffect, useRef, useState } from "react";
import {
  fetchProfile,
  getApiErrorMessage,
  requestPasswordResetEmail,
  updateProfile,
} from "../api/auth";
import { getTrackerMetrics, getWeekly } from "../api/habits";
import Dialog from "./Dialog";
import LoadingSpinner from "./LoadingSpinner";
import { getCurrentWeekStartIsoDate } from "../utils/dateUtils";
import {
  buttonClassName,
  eyebrowClassName,
  helpTextClassName,
  inputClassName,
  labelClassName,
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

  const displayNameForProfile = [form.first_name?.trim(), form.last_name?.trim()].filter(Boolean).join(" ") || "—";
  const handleInitial = displayNameForProfile !== "—" ? displayNameForProfile[0].toUpperCase() : "?";

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <LoadingSpinner label="Cargando perfil..." />
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">

      {/* Page head */}
      <div className="mb-8">
        <span className={eyebrowClassName}>Perfil</span>
        <h1 className="font-serif text-[length:var(--text-h1)] leading-tight tracking-[-0.02em] mt-2">
          Tu cuaderno,<br /><em>tus reglas.</em>
        </h1>
      </div>

      {/* Profile grid: sidebar + form */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-12">

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          {/* Avatar card */}
          <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-8 text-center">
            <div className="relative inline-block mb-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Perfil"
                  width={96}
                  height={96}
                  decoding="async"
                  className="w-24 h-24 rounded-full object-cover border border-ink/10 mx-auto"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-ink text-paper flex items-center justify-center font-serif text-[36px] mx-auto">
                  {handleInitial}
                </div>
              )}
            </div>
            <div className="font-serif text-[26px] leading-tight">{displayNameForProfile}</div>
            <div className="font-mono text-[11px] text-ink-3 mt-1 tracking-[0.08em]">@{form.email?.split("@")[0] || "—"}</div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { setSuccess(""); setPendingPhoto(null); setShowPhotoModal(true); }}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                Cambiar foto
              </button>
              {hasCustomAvatar && !avatarFile && (
                <button
                  type="button"
                  onClick={() => { setSuccess(""); setAvatarFile(null); setRemoveAvatar(true); setHasCustomAvatar(false); setAvatarPreview(""); }}
                  className={buttonClassName({ variant: "danger", size: "sm" })}
                >
                  Eliminar foto
                </button>
              )}
              {removeAvatar && (
                <button
                  type="button"
                  onClick={() => { setSuccess(""); setRemoveAvatar(false); setHasCustomAvatar(Boolean(persistedAvatarPreview)); setAvatarPreview(persistedAvatarPreview); }}
                  className={buttonClassName({ variant: "ghost", size: "sm" })}
                >
                  Deshacer
                </button>
              )}
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => { setSuccess(""); setAvatarFile(null); if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); setPreviewObjectUrl(""); } setAvatarPreview(persistedAvatarPreview); }}
                  className={buttonClassName({ variant: "ghost", size: "sm" })}
                >
                  Quitar foto nueva
                </button>
              )}
            </div>
            <div className="font-mono text-[10px] text-ink-4 mt-3 tracking-[0.06em]">JPG · PNG · WEBP · MÁX 2MB</div>
          </div>

          {/* Streak card */}
          <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-5">
            <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Racha actual</span>
            <div className="font-serif mt-2">
              <span className="text-[56px] leading-none">
                {summaryLoading ? "…" : (profileSummary.streakCurrent ?? 0)}
              </span>
              <span className="text-[20px] text-ink-3 ml-1.5">días</span>
            </div>
            <p className="text-[13px] text-ink-3 mt-1">Tu mejor racha activa.</p>
          </div>

          {/* Completion card */}
          <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-5">
            <span className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">Cumplimiento promedio</span>
            <div className="font-serif mt-2">
              <span className="text-[56px] leading-none">
                {summaryLoading ? "…" : (profileSummary.averageCompletion !== null && profileSummary.averageCompletion !== undefined ? profileSummary.averageCompletion : "—")}
              </span>
              {!summaryLoading && profileSummary.averageCompletion !== null && profileSummary.averageCompletion !== undefined && (
                <span className="text-[20px] text-ink-3">%</span>
              )}
            </div>
            <p className="text-[13px] text-ink-3 mt-1">Promedio de avance esta semana.</p>
          </div>
        </aside>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section>
          <span className={eyebrowClassName}>Identidad</span>
          <h2 className="font-serif text-[32px] leading-tight mt-2 mb-6">Datos personales</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <label
              className={`${labelClassName} mb-1 flex items-center gap-1.5`}
            >
              Nombre
              {isFieldDirty("first_name") && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
                  : ""
              }`}
            />
            {getVisibleFieldError("first_name") && (
              <p className="mt-1.5 text-xs text-signal">
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
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
                  : ""
              }`}
            />
            {getVisibleFieldError("last_name") && (
              <p className="mt-1.5 text-xs text-signal">
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
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
                  : ""
              }`}
            />
            {getVisibleFieldError("email") && (
              <p className="mt-1.5 text-xs text-signal">
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
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
                  : ""
              }`}
            />
            {getVisibleFieldError("birth_date") && (
              <p className="mt-1.5 text-xs text-signal">
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
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
                  : ""
              }`}
            />
            {getVisibleFieldError("weight_kg") && (
              <p className="mt-1.5 text-xs text-signal">
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
                  className="inline-block h-1.5 w-1.5 rounded-full bg-lime"
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
                  ? "border-lime"
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
              <p className="mt-1.5 text-xs text-signal">
                {getVisibleFieldError("gender")}
              </p>
            )}
          </div>
        </div>
        </section>

        <hr className="border-ink/10" />

        <section>
          <span className={eyebrowClassName}>Cuenta</span>
          <h2 className="font-serif text-[32px] leading-tight mt-2 mb-6">Seguridad</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={sendingResetEmail}
              onClick={handlePasswordResetRequest}
              className={buttonClassName({ variant: "ghost" })}
              aria-busy={sendingResetEmail}
            >
              {sendingResetEmail ? "Enviando correo..." : "Restaurar contraseña"}
            </button>
          </div>
        </section>

        {error && (
          <p className="rounded-[14px] border border-signal/25 bg-signal-soft px-4 py-3 text-sm text-signal">
            {error}
          </p>
        )}
        {passwordResetMessage && (
          <p className="rounded-[14px] border border-lime/30 bg-lime/8 px-4 py-3 text-sm">
            {passwordResetMessage}
          </p>
        )}

        <hr className="border-ink/10" />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className={buttonClassName({ variant: "primary" })}
            aria-busy={saving}
            title={!isDirty && !saving ? "No hay cambios" : undefined}
          >
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
          {isDirty && (
            <span className="font-mono text-[11px] text-ink-3">Tienes cambios sin guardar.</span>
          )}
          {success && successVisible && (
            <span className="fade-up font-mono text-[11px] tracking-[0.1em] uppercase text-lime-ink bg-lime px-3 py-1.5 rounded-full">
              ✓ {success}
            </span>
          )}
        </div>
      </form>
      </div>

      <Dialog
        open={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="Confirmar cambios"
        panelClassName="max-w-sm p-5"
      >
        <p className="text-sm text-ink-3 mt-2">¿Guardar cambios?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowSaveConfirm(false)}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
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
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper"
                  aria-hidden="true"
                />
                Guardando...
              </>
            ) : (
              "Sí, guardar"
            )}
          </button>
        </div>
      </Dialog>

      <Dialog
        open={showPhotoModal}
        onClose={() => { setPendingPhoto(null); setShowPhotoModal(false); }}
        title="Subir foto"
        panelClassName="max-w-md p-5 sm:p-6"
      >
        <p className="text-sm text-ink-3 mt-2">
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

        <div className="mt-4 rounded-[10px] border border-ink/10 bg-paper-2 p-3">
          <p className={helpTextClassName}>
            {pendingPhoto ? pendingPhoto.name : "Aún no elegiste archivo."}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Elegir archivo
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setPendingPhoto(null); setShowPhotoModal(false); }}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
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
      </Dialog>
    </div>
  );
}
