import { useState } from "react";
import {
  getApiErrorMessage,
  login,
  register,
  requestPasswordResetByEmail,
} from "../api/auth";
import { buttonClassName, inputClassName, labelClassName } from "./ui.js";

const defaultLogin    = { username: "", password: "" };
const defaultRegister = { username: "", email: "", password: "" };

export default function AuthPanel({ onAuthenticated }) {
  const [mode, setMode]                         = useState("login");
  const [loginForm, setLoginForm]               = useState(defaultLogin);
  const [registerForm, setRegisterForm]         = useState(defaultRegister);
  const [showLoginPwd, setShowLoginPwd]         = useState(false);
  const [showRegisterPwd, setShowRegisterPwd]   = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [error, setError]                       = useState("");
  const [showForgot, setShowForgot]             = useState(false);
  const [forgotEmail, setForgotEmail]           = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage]       = useState("");
  const [forgotError, setForgotError]           = useState("");

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setShowForgot(false);
    setForgotError("");
    setForgotMessage("");
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(loginForm);
      onAuthenticated();
      setLoginForm(defaultLogin);
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos iniciar sesión. Intenta de nuevo."));
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(registerForm);
      await login({ username: registerForm.username, password: registerForm.password });
      onAuthenticated();
      setRegisterForm(defaultRegister);
    } catch (err) {
      setError(getApiErrorMessage(err, "No pudimos crear tu cuenta. Revisa los datos e intenta otra vez."));
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async (e) => {
    e.preventDefault();
    if (forgotSubmitting) return;
    setForgotSubmitting(true);
    setForgotError("");
    setForgotMessage("");
    try {
      const res = await requestPasswordResetByEmail(forgotEmail);
      setForgotMessage(res?.detail || "Si existe una cuenta con ese correo, recibirás un enlace de recuperación.");
    } catch (err) {
      setForgotError(getApiErrorMessage(err, "No pudimos procesar la solicitud en este momento."));
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
      {/* Page header */}
      <div className="pt-14 pb-0 mb-12">
        <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3">
          Manifiesto · 01
        </span>
        <h1 className="font-serif font-normal text-[clamp(40px,6vw,72px)] leading-[0.98] tracking-[-0.025em] mt-3 mb-4">
          Convierte intención<br />
          <em className="italic text-ink-3">en acción.</em>
        </h1>
        <p className="text-lg text-ink-2 max-w-[560px] leading-relaxed">
          Un cuaderno digital para construir hábitos, mantener la disciplina y avanzar día tras día — sin distracciones, sin gamificación vacía.
        </p>
      </div>

      {/* Split layout */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] min-h-[620px] border border-ink/10 rounded-[24px] overflow-hidden bg-paper-2 mb-16">

        {/* Left — dark manifesto panel */}
        <div className="relative hidden lg:flex flex-col justify-between p-14 bg-[#161513] text-[#FAFAF7] overflow-hidden">
          {/* Lime glow */}
          <div
            className="absolute -top-[200px] -right-[200px] w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle at center, rgba(200,240,80,0.18), transparent 60%)" }}
          />

          <div className="relative z-10">
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase" style={{ color: "rgba(242,237,226,0.55)" }}>
              Volición · sustantivo
            </span>
            <p className="font-serif text-[28px] leading-[1.25] mt-5 max-w-[420px]">
              <em>"El acto de la voluntad por el cual se decide hacer algo. La fuerza con que se ejecuta."</em>
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4 pt-8 border-t" style={{ borderColor: "rgba(242,237,226,0.12)" }}>
            {[
              { eyebrow: "Diario",   num: "01", label: "Hoy importa." },
              { eyebrow: "Semanal",  num: "07", label: "El ritmo." },
              { eyebrow: "Mensual",  num: "30", label: "El cambio." },
            ].map(({ eyebrow, num, label }) => (
              <div key={num}>
                <span className="font-mono text-[11px] tracking-[0.12em] uppercase" style={{ color: "rgba(242,237,226,0.5)" }}>
                  {eyebrow}
                </span>
                <div className="font-serif text-[36px] leading-none mt-2 mb-1 text-[#FAFAF7]">{num}</div>
                <div className="text-xs" style={{ color: "rgba(242,237,226,0.7)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-14 bg-paper">

          {/* Toggle */}
          <div className="inline-flex self-start bg-paper-2 border border-ink/10 rounded-full p-1 mb-8">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all",
                mode === "login" ? "bg-ink text-paper" : "bg-transparent text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={[
                "px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-all",
                mode === "register" ? "bg-ink text-paper" : "bg-transparent text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              Crear cuenta
            </button>
          </div>

          <div key={mode} className="page-fade">
            <h2 className="font-serif text-[44px] leading-none tracking-[-0.02em] mb-1">
              {mode === "login" ? "Bienvenido." : "Empieza hoy."}
            </h2>
            <p className="text-ink-3 mt-2 mb-8">
              {mode === "login" ? "Continúa donde lo dejaste." : "Una decisión cada día."}
            </p>

            {mode === "login" ? (
              <form onSubmit={onLogin} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className={labelClassName}>Usuario</label>
                  <input
                    type="text"
                    placeholder="tu_nombre"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClassName}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showLoginPwd ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      className={inputClassName + " pr-20"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd((p) => !p)}
                      className="absolute right-0 top-3 font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink transition-colors"
                    >
                      {showLoginPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgot((p) => !p); setForgotError(""); setForgotMessage(""); }}
                    className="font-mono text-[12px] tracking-[0.06em] text-ink-3 hover:text-ink transition-colors text-left"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={buttonClassName({ variant: "primary" })}
                    aria-busy={submitting}
                  >
                    {submitting ? "Iniciando..." : <>Entrar <em className="font-serif not-italic">→</em></>}
                  </button>
                </div>

                {showForgot && (
                  <div className="rounded-[14px] border border-ink/10 bg-paper-2 p-4 flex flex-col gap-3">
                    <label className={labelClassName}>Correo de tu cuenta</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className={inputClassName}
                    />
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      disabled={forgotSubmitting}
                      className={buttonClassName({ variant: "ghost", size: "sm" })}
                      aria-busy={forgotSubmitting}
                    >
                      {forgotSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
                    </button>
                    {forgotError   && <p className="text-sm text-signal">{forgotError}</p>}
                    {forgotMessage && <p className="text-sm text-lime-ink">{forgotMessage}</p>}
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={onRegister} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className={labelClassName}>Usuario</label>
                  <input
                    type="text"
                    placeholder="elige_un_nombre"
                    required
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClassName}>Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    required
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className={labelClassName}>Contraseña</label>
                  <div className="relative">
                    <input
                      type={showRegisterPwd ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                      className={inputClassName + " pr-20"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPwd((p) => !p)}
                      className="absolute right-0 top-3 font-mono text-[11px] tracking-[0.08em] uppercase text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink transition-colors"
                    >
                      {showRegisterPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={buttonClassName({ variant: "primary" })}
                    aria-busy={submitting}
                  >
                    {submitting ? "Creando cuenta..." : <>Crear cuenta <em className="font-serif not-italic">→</em></>}
                  </button>
                </div>
              </form>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-[14px] border border-signal/25 bg-signal-soft px-4 py-3 text-sm text-signal">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
