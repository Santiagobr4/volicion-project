import { useState } from "react";
import { getApiErrorMessage, login, register } from "../api/auth";

const defaultLogin = {
  username: "",
  password: "",
};

const defaultRegister = {
  username: "",
  email: "",
  password: "",
};

export default function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [registerForm, setRegisterForm] = useState(defaultRegister);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const metrics = [
    { label: "Diario", value: "Enfoque" },
    { label: "Semanal", value: "Ritmo" },
    { label: "Mensual", value: "Progreso" },
  ];

  const heroContent = (
    <>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
          Volicion
        </p>
        <h2 className="mt-4 text-3xl md:text-4xl font-semibold leading-tight">
          Convierte intención en acción.
        </h2>
        <p className="mt-4 text-slate-200/90 max-w-xl">
          Construye hábitos, mantén la disciplina y logra tus objetivos.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-white/20 bg-white/10 p-3"
          >
            <p className="text-lg font-semibold">{metric.label}</p>
            <p className="text-xs text-slate-300 mt-1">{metric.value}</p>
          </div>
        ))}
      </div>
    </>
  );

  const onLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(loginForm);
      onAuthenticated();
      setLoginForm(defaultLogin);
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No pudimos iniciar sesión. Intenta de nuevo.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await register(registerForm);
      await login({
        username: registerForm.username,
        password: registerForm.password,
      });
      onAuthenticated();
      setRegisterForm(defaultRegister);
    } catch (error) {
      setError(
        getApiErrorMessage(
          error,
          "No pudimos crear tu cuenta. Revisa los datos e intenta otra vez.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 shadow-sm overflow-hidden">
      <div className="grid lg:grid-cols-2 lg:items-stretch">
        <div className="relative hidden lg:flex flex-col h-full min-h-140 p-8 bg-linear-to-br from-slate-900 to-slate-700 text-white">
          <div className="flex h-full flex-col justify-between">
            {heroContent}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="lg:hidden mb-5 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-linear-to-br from-slate-900 to-slate-700 text-white p-5 shadow-sm">
            {heroContent}
          </div>

          <div className="inline-flex rounded-xl border border-slate-300 dark:border-slate-600 p-1 bg-slate-100/80 dark:bg-slate-800/80 mb-6 transition-all duration-300 ease-out">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                mode === "login"
                  ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                mode === "register"
                  ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div
            key={mode}
            className="fade-in motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out"
          >
            <h3 className="text-2xl font-semibold tracking-tight mb-1">
              {mode === "login" ? "Bienvenido" : "Crea tu cuenta"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
              {mode === "login"
                ? "Inicia sesión para continuar."
                : "Empieza hoy."}
            </p>

            {mode === "login" ? (
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
                    Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. santi"
                    required
                    value={loginForm.username}
                    onChange={(event) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Tu contraseña"
                    required
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer font-medium"
                >
                  {submitting ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </form>
            ) : (
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
                    Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="Elige un usuario"
                    required
                    value={registerForm.username}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1 text-slate-500 dark:text-slate-300">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-black dark:text-white outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90 disabled:opacity-50 cursor-pointer font-medium"
                >
                  {submitting ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </form>
            )}
          </div>

          {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
}
