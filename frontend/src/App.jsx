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
import {
  buttonClassName,
  panelShellClassName,
  segmentedButtonClassName,
} from "./components/ui.js";

const HistoryPanel = lazy(() => import("./components/HistoryPanel"));
const RankingPanel = lazy(() => import("./components/RankingPanel"));
const ProfilePanel = lazy(() => import("./components/ProfilePanel"));

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

    document.title = "VOLICION | Hábitos, disciplina y progreso";

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = mediaQuery.matches;
      root.classList.toggle("dark", isDark);
    }

    if (theme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", theme);
    }

    if (theme !== "system") {
      return undefined;
    }

    const handleChange = (event) => {
      root.classList.toggle("dark", event.matches);
    };

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
    try {
      await logout();
    } finally {
      clearHabitOrder(profile?.user_id);
      setIsAuthenticated(false);
      setProfile(null);
      setShowLogoutConfirm(false);
    }
  };

  const notifyMetricsChanged = () => {
    setMetricsRefreshVersion((prev) => prev + 1);
  };

  const themeButtonClass = (mode) => {
    const isSelected = theme === mode;
    return segmentedButtonClassName(isSelected);
  };

  const fullName = [profile?.first_name?.trim(), profile?.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = fullName || profile?.username || "Usuario";
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

    return (
      <WeeklyTable
        onDataChanged={notifyMetricsChanged}
        storageNamespace={profile?.user_id}
      />
    );
  };

  return (
    <div className="overflow-x-clip text-black dark:text-white transition">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className={`${panelShellClassName} backdrop-blur p-4 sm:p-5`}>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                VOLICION
              </h1>
              <p className="text-slate-500 dark:text-slate-300 mt-1">
                Construye hábitos, mantén la disciplina y logra tus objetivos.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={themeButtonClass("light")}
                aria-label="Tema claro"
                aria-pressed={theme === "light"}
              >
                Claro
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={themeButtonClass("dark")}
                aria-label="Tema oscuro"
                aria-pressed={theme === "dark"}
              >
                Oscuro
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={themeButtonClass("system")}
                aria-label="Tema del sistema"
                aria-pressed={theme === "system"}
              >
                Sistema
              </button>
            </div>
          </div>
        </div>

        {profileError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {profileError}
          </p>
        )}

        {isAuthenticated ? (
          <>
            <div
              className={`${panelShellClassName} mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4`}
            >
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
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className={
                    buttonClassName({ variant: "danger", fullWidth: true }) +
                    " sm:w-auto"
                  }
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
              <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center px-3 py-4">
                <div className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xl">
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
                        handleLogout();
                      }}
                      className={buttonClassName({
                        variant: "danger",
                        size: "sm",
                      })}
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
