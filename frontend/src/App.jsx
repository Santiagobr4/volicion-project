import { Suspense, lazy, useEffect, useState } from "react";
import {
  clearAuthTokens,
  fetchProfile,
  getStoredAccessToken,
  logout,
  refreshAccessToken,
} from "./api/auth";
import AuthPanel from "./components/AuthPanel";
import LoadingSpinner from "./components/LoadingSpinner";
import SectionTabs from "./components/SectionTabs";
import WeeklyTable from "./components/WeeklyTable";
import defaultAvatar from "./assets/default-avatar.svg";
import { clearHabitOrder } from "./utils/habitOrderStorage";
import { buttonClassName, segmentedButtonClassName, segmentedContainerClassName } from "./components/ui.js";

const HistoryPanel = lazy(() => import("./components/HistoryPanel"));
const RankingPanel = lazy(() => import("./components/RankingPanel"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));

function BrandMark() {
  return (
    <span className="relative inline-flex w-[22px] h-[22px] rounded-full bg-ink items-center justify-center shrink-0">
      <span className="absolute inset-[4px] rounded-full bg-paper" />
      <span className="relative z-10 w-[6px] h-[6px] rounded-full bg-ink" />
    </span>
  );
}

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!getStoredAccessToken(),
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [section, setSection] = useState("tracker");
  const [metricsRefreshVersion, setMetricsRefreshVersion] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    document.title = "VOLICION — Convierte intención en acción.";

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle("dark", mediaQuery.matches);
    }

    localStorage[theme === "system" ? "removeItem" : "setItem"]("theme", theme);

    if (theme !== "system") return undefined;

    const handleChange = (e) => root.classList.toggle("dark", e.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  useEffect(() => {
    let isCancelled = false;
    const loadProfile = async () => {
      try {
        if (!isAuthenticated) {
          await refreshAccessToken();
          if (!isCancelled) setIsAuthenticated(true);
        }
        if (!isCancelled) setProfileError("");
        const user = await fetchProfile();
        if (!isCancelled) setProfile(user);
      } catch {
        if (!isCancelled) {
          clearAuthTokens();
          setIsAuthenticated(false);
          setProfile(null);
          if (isAuthenticated) setProfileError("Tu sesión expiró. Inicia sesión de nuevo.");
        }
      }
    };
    loadProfile();
    return () => { isCancelled = true; };
  }, [isAuthenticated]);

  const handleAuthenticated = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    try { await logout(); }
    finally {
      clearHabitOrder(profile?.user_id);
      setIsAuthenticated(false);
      setProfile(null);
      setShowLogoutConfirm(false);
    }
  };

  const notifyMetricsChanged = () => setMetricsRefreshVersion((prev) => prev + 1);

  const fullName = [profile?.first_name?.trim(), profile?.last_name?.trim()]
    .filter(Boolean).join(" ").trim();
  const displayName = fullName || profile?.username || "Usuario";
  const avatarSrc = profile?.avatar_file_url || defaultAvatar;

  const now = new Date();
  const weekday = new Intl.DateTimeFormat("es-419", { weekday: "short" }).format(now).toUpperCase();
  const day = now.getDate().toString().padStart(2, "0");
  const month = new Intl.DateTimeFormat("es-419", { month: "long" }).format(now).toUpperCase();
  const year = now.getFullYear();
  const todayLabel = `${weekday} · ${day} ${month} · ${year}`;

  const renderSection = () => {
    if (section === "history")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><HistoryPanel refreshVersion={metricsRefreshVersion} /></Suspense>;
    if (section === "profile")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><ProfilePanel onProfileChange={setProfile} /></Suspense>;
    if (section === "ranking")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><RankingPanel refreshVersion={metricsRefreshVersion} /></Suspense>;
    return <WeeklyTable onDataChanged={notifyMetricsChanged} storageNamespace={profile?.user_id} />;
  };

  return (
    <div className="text-ink">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-[18px] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[22px] tracking-[0.02em]">VOLICION</span>
            <span className="hidden md:block font-mono text-[11px] text-ink-4 tracking-[0.12em] uppercase ml-3">
              ÍNDICE {String(getWeekNumber(now)).padStart(3, "0")} · {new Intl.DateTimeFormat("es-419", { month: "short" }).format(now).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className={segmentedContainerClassName}>
              {[["light", "Claro"], ["dark", "Oscuro"], ["system", "Sistema"]].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={segmentedButtonClassName(theme === mode)}
                  aria-pressed={theme === mode}
                >
                  {label}
                </button>
              ))}
            </div>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className={buttonClassName({ variant: "ghost", size: "sm" })}
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {profileError && (
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-4">
          <p className="rounded-[14px] border border-signal/25 bg-signal-soft px-4 py-3 text-signal text-sm">
            {profileError}
          </p>
        </div>
      )}

      {isAuthenticated ? (
        <>
          {/* User card + tabs */}
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5 px-7 bg-paper-2 rounded-[18px] border border-ink/10">
              <div className="flex items-center gap-4">
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border border-ink/10"
                />
                <div>
                  <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3">
                    Conectado como
                  </span>
                  <p className="font-serif text-[26px] leading-none mt-1">{displayName}</p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-3">Hoy</span>
                <span className="font-mono text-[13px]">{todayLabel}</span>
              </div>
            </div>

            <div className="mt-4">
              <SectionTabs current={section} onChange={setSection} />
            </div>
          </div>

          <div key={section} className="page-fade">
            {renderSection()}
          </div>

          {/* Logout confirm */}
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-sm flex items-center justify-center px-3 py-4">
              <div className="w-full max-w-sm rounded-[18px] border border-ink/10 bg-paper p-6 shadow-xl">
                <h3 className="font-serif text-[28px] leading-none">Cerrar sesión</h3>
                <p className="text-sm text-ink-3 mt-2">¿Quieres cerrar tu sesión?</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className={buttonClassName({ variant: "ghost", size: "sm" })}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={buttonClassName({ variant: "danger", size: "sm" })}
                  >
                    Sí, salir
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <AuthPanel onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export default App;
