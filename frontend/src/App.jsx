import { Suspense, lazy, useEffect, useState } from "react";
import {
  clearAuthTokens,
  fetchProfile,
  getStoredAccessToken,
  logout,
  refreshAccessToken,
} from "./api/auth";
import AuthPanel from "./components/AuthPanel";
import Dialog from "./components/Dialog";
import LoadingSpinner from "./components/LoadingSpinner";
import SectionTabs from "./components/SectionTabs";
import WeeklyTable from "./components/WeeklyTable";
import defaultAvatar from "./assets/default-avatar.svg";
import { clearHabitOrder } from "./utils/habitOrderStorage";
import { buttonClassName } from "./components/ui.js";

const HistoryPanel = lazy(() => import("./components/HistoryPanel"));
const RankingPanel = lazy(() => import("./components/RankingPanel"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));

function ThemeToggle({ theme, setTheme }) {
  const modes = [
    {
      key: "light",
      label: "Claro",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ),
    },
    {
      key: "dark",
      label: "Oscuro",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
    },
    {
      key: "system",
      label: "Sistema",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => setTheme(m.key)}
          aria-label={`Tema ${m.label}`}
          aria-pressed={theme === m.key}
          title={m.label}
          className={`w-11 h-11 inline-flex items-center justify-center rounded-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
            theme === m.key ? "text-ink" : "text-ink-4 hover:text-ink-2"
          }`}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}

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

  const renderSection = () => {
    if (section === "history")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><HistoryPanel refreshVersion={metricsRefreshVersion} /></Suspense>;
    if (section === "profile")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><ProfilePanel onProfileChange={setProfile} /></Suspense>;
    if (section === "ranking")
      return <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}><RankingPanel refreshVersion={metricsRefreshVersion} /></Suspense>;
    return <WeeklyTable onDataChanged={notifyMetricsChanged} storageNamespace={profile?.user_id} user={profile?.first_name || displayName} />;
  };

  return (
    <div className="text-ink">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-[18px] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[22px] tracking-[0.02em]">VOLICION</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} setTheme={setTheme} />
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
          {/* Combined identity + nav */}
          <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mt-6">
            <div className="relative">
              <div className="flex items-center gap-3 sm:gap-6 border-b border-ink/10 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2.5 shrink-0 pr-3 sm:pr-6 border-r border-ink/10 self-stretch">
                  {profile?.avatar_file_url ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      width={28}
                      height={28}
                      decoding="async"
                      className="w-7 h-7 rounded-full object-cover border border-ink/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-paper-3 border border-ink/10 flex items-center justify-center font-serif text-[14px] leading-none text-ink">
                      {displayName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="font-serif text-[16px] sm:text-[18px] leading-none whitespace-nowrap">{displayName}</span>
                </div>
                <SectionTabs current={section} onChange={setSection} />
              </div>
              {/* Fade-out indicator on the right edge — hints at scrollable content on small screens */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-paper to-transparent sm:hidden"
              />
            </div>
          </div>

          <div key={section} className="page-fade">
            {renderSection()}
          </div>

          {/* Logout confirm */}
          <Dialog
            open={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            title="Cerrar sesión"
            panelClassName="max-w-sm p-6"
          >
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
          </Dialog>
        </>
      ) : (
        <AuthPanel onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}

export default App;
