import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, getApiErrorMessage } from "../api/auth";
import {
  buttonClassName,
  helpTextClassName,
  inputClassName,
  labelClassName,
  panelShellClassName,
} from "../components/ui.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = useMemo(() => searchParams.get("uid") || "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Restablecer contraseña | VOLICION";
  }, []);

  const hasResetParams = Boolean(uid && token);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    if (!hasResetParams) {
      setError("El enlace de recuperación no es válido o está incompleto.");
      return;
    }

    if (password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await confirmPasswordReset({
        uid,
        token,
        newPassword: password,
      });
      setSuccess(
        response?.detail || "Tu contraseña fue restablecida correctamente.",
      );
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "No se pudo restablecer tu contraseña. Solicita un nuevo enlace.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={`${panelShellClassName} max-w-xl mx-auto p-5 sm:p-6 md:p-8`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
        VOLICION
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Restablecer contraseña
      </h1>
      <p className={`mt-2 ${helpTextClassName}`}>
        Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
      </p>

      {!hasResetParams && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          El enlace no contiene los datos necesarios. Vuelve a pedir el correo
          desde tu perfil.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className={`${labelClassName} mb-1`}>Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              className={`${inputClassName} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={
                buttonClassName({ variant: "secondary", size: "sm" }) +
                " absolute right-2 top-1/2 -translate-y-1/2"
              }
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div>
          <label className={`${labelClassName} mb-1`}>
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repite la contraseña"
              minLength={8}
              required
              className={`${inputClassName} pr-20`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className={
                buttonClassName({ variant: "secondary", size: "sm" }) +
                " absolute right-2 top-1/2 -translate-y-1/2"
              }
            >
              {showConfirmPassword ? "Ocultar" : "Mostrar"}
            </button>
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

        <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="submit"
            disabled={submitting || !hasResetParams}
            className={buttonClassName({ variant: "primary" })}
            aria-busy={submitting}
          >
            {submitting ? "Actualizando..." : "Guardar nueva contraseña"}
          </button>

          <Link to="/" className={buttonClassName({ variant: "secondary" })}>
            Volver al inicio
          </Link>
        </div>
      </form>
    </section>
  );
}
