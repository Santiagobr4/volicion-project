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

const HistoryPanel = lazy(() => import("./components/HistoryPanel"));
const RankingPanel = lazy(() => import("./components/RankingPanel"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system");
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

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    }

    if (theme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      try {
        if (!isAuthenticated) {
          await refreshAccessToken();
          if (!isCancelled) {
            setIsAuthenticated(true);
          }
        }

        if (!isCancelled) {
          setProfileError("");
        }
        const user = await fetchProfile();
        if (!isCancelled) {
          setProfile(user);
        }
      } catch {
        if (!isCancelled) {
          clearAuthTokens();
          setIsAuthenticated(false);
          setProfile(null);
          if (isAuthenticated) {
            setProfileError("Tu sesión expiró. Inicia sesión de nuevo.");
          }
        }
      }
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setProfile(null);
    setShowLogoutConfirm(false);
  };

  const notifyMetricsChanged = () => {
    setMetricsRefreshVersion((prev) => prev + 1);
  };

  const themeButtonClass = (mode) => {
    const isSelected = theme === mode;
    return `px-3 py-2 rounded-xl cursor-pointer border transition ${
      isSelected
        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
        : "bg-slate-100 dark:bg-slate-800 border-transparent"
    }`;
  };

  const displayName =
    profile?.first_name?.trim() || profile?.username || "Usuario";
  const avatarSrc = profile?.avatar_file_url || defaultAvatar;
  const todayLabel = new Intl.DateTimeFormat("es-419", {
    weekday: "short",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const renderSection = () => {
    if (section === "history") {
      return (
        <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}>
          <HistoryPanel refreshVersion={metricsRefreshVersion} />
        </Suspense>
      );
    }

    if (section === "profile") {
      return (
        <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}>
          <ProfilePanel onProfileChange={setProfile} />
        </Suspense>
      );
    }

    if (section === "ranking") {
      return (
        <Suspense fallback={<LoadingSpinner label="Cargando sección..." />}>
          <RankingPanel refreshVersion={metricsRefreshVersion} />
        </Suspense>
      );
    }

    return <WeeklyTable onDataChanged={notifyMetricsChanged} />;
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-linear-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 text-black dark:text-white p-3 sm:p-4 md:p-6 transition">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Volicion
              </h1>
              <p className="text-slate-500 dark:text-slate-300 mt-1">
                Construye hábitos, mantén la disciplina y logra tus objetivos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTheme("light")}
                className={themeButtonClass("light")}
                aria-label="Tema claro"
              >
                Claro
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={themeButtonClass("dark")}
                aria-label="Tema oscuro"
              >
                Oscuro
              </button>

              <button
                onClick={() => setTheme("system")}
                className={themeButtonClass("system")}
                aria-label="Tema del sistema"
              >
                Sistema
              </button>
            </div>
          </div>
        </div>

        {profileError && <p className="mb-4 text-red-500">{profileError}</p>}

        {isAuthenticated ? (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={avatarSrc}
                  alt="Avatar de usuario"
                  className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                />

                <div className="min-w-0">
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Conectado como
                  </p>
                  <p className="font-semibold truncate">{displayName}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
                  {todayLabel}
                </p>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

            <SectionTabs current={section} onChange={setSection} />

            <div key={section} className="fade-in">
              {renderSection()}
            </div>

            {showLogoutConfirm && (
              <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 px-3">
                <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl">
                  <h3 className="text-lg font-semibold">
                    Confirmar cierre de sesión
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
                    ¿Quieres cerrar sesión?
                  </p>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                      }}
                      className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    >
                      Sí, cerrar sesión
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
    </div>
  );
}

export default App;
