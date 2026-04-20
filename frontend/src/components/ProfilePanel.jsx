import { useEffect, useRef, useState } from "react";
import {
  fetchProfile,
  getApiErrorMessage,
  requestPasswordResetEmail,
  updateProfile,
} from "../api/auth";
import defaultAvatar from "../assets/default-avatar.svg";
import LoadingSpinner from "./LoadingSpinner";
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

/**
 * Profile editor for authenticated users.
 *
 * Props:
 * - onProfileChange(updatedProfile): optional callback to sync profile in parent shell.
 */
export default function ProfilePanel({ onProfileChange }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      try {
        if (!isCancelled) {
          setLoading(true);
          setError("");
        }
        const profile = await fetchProfile();
        const remoteAvatar = profile.avatar_file_url || "";
        if (!isCancelled) {
          setForm({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            email: profile.email || "",
            birth_date: profile.birth_date || "",
            weight_kg: profile.weight_kg || "",
            gender: ALLOWED_GENDERS.has(profile.gender)
              ? profile.gender
              : "prefer_not_to_say",
          });
          setPersistedAvatarPreview(remoteAvatar);
          setAvatarPreview(remoteAvatar);
          setHasCustomAvatar(Boolean(remoteAvatar));
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
      setSuccess("Perfil actualizado.");
      setAvatarFile(null);
      setRemoveAvatar(false);
      const nextAvatar = updatedProfile.avatar_file_url || "";
      setPersistedAvatarPreview(nextAvatar);
      setAvatarPreview(nextAvatar);
      setHasCustomAvatar(Boolean(nextAvatar));
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
    if (saving) return;
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
            <label className={`${labelClassName} mb-1`}>Nombre</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, first_name: event.target.value }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className={`${labelClassName} mb-1`}>Apellido</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, last_name: event.target.value }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className={`${labelClassName} mb-1`}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className={`${labelClassName} mb-1`}>
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, birth_date: event.target.value }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className={`${labelClassName} mb-1`}>Peso (kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.weight_kg}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, weight_kg: event.target.value }))
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label className={`${labelClassName} mb-1`}>Género</label>
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, gender: event.target.value }))
              }
              className={inputClassName}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </p>
        )}
        {passwordResetMessage && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            {passwordResetMessage}
          </p>
        )}

        <div className="pt-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className={buttonClassName({ variant: "primary" })}
              aria-busy={saving}
            >
              {saving ? "Guardando..." : "Guardar perfil"}
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
                {saving ? "Guardando..." : "Sí, guardar"}
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
