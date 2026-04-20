import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, getApiErrorMessage } from "../api/auth";

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
    <section className="max-w-xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/85 shadow-sm p-5 sm:p-6 md:p-8">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
        VOLICION
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Restablecer contraseña
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
      </p>

      {!hasResetParams && (
        <p className="mt-4 text-sm text-red-500">
          El enlace no contiene los datos necesarios. Vuelve a pedir el correo
          desde tu perfil.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 pr-20 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
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
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 pr-20 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {showConfirmPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            type="submit"
            disabled={submitting || !hasResetParams}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "Actualizando..." : "Guardar nueva contraseña"}
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Volver al inicio
          </Link>
        </div>
      </form>
    </section>
  );
}
