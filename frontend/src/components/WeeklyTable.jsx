import { useEffect, useMemo, useState } from "react";
import { useHabits } from "../hooks/useHabits";
import HabitRow from "./HabitRow";
import HabitCardMobile from "./HabitCardMobile";
import HabitModal from "./HabitModal";
import HabitOrderModal from "./HabitOrderModal";
import ConfirmDialog from "./ConfirmDialog";
import TrackerInsights from "./TrackerInsights";
import Toast from "./Toast";
import { getIsoDateLabel, getIsoDayNameLong } from "../utils/dateLabels";
import { getCurrentWeekStartIsoDate } from "../utils/dateUtils";
import { loadHabitOrder, saveHabitOrder } from "../utils/habitOrderStorage";
import LoadingSpinner from "./LoadingSpinner";

const DONE_FEEDBACK_MESSAGES = [
  "Buen trabajo. Sumaste otro check a tu semana.",
  "Excelente. Sigues construyendo constancia.",
  "¡Hecho! Un paso más hacia tu mejor racha.",
  "Muy bien. Mantener el ritmo es lo que cuenta.",
];

/**
 * Weekly tracker table that coordinates CRUD actions, status updates, and insights.
 */
export default function WeeklyTable({ onDataChanged, storageNamespace }) {
  const {
    data,
    dates,
    trackerMetrics,
    startDate,
    loading,
    refreshing,
    error,
    canGoPrev,
    canGoNext,
    changeWeek,
    goToCurrentWeek,
    handleUpdate,
    handleCreate,
    handleEdit,
    handleDelete,
  } = useHabits({ onDataChanged });

  const [showModal, setShowModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeOrder, setActiveOrder] = useState(() =>
    loadHabitOrder(storageNamespace),
  );
  const canManageHabits = new Date().getDay() === 0;
  const [draftOrder, setDraftOrder] = useState([]);
  const isCurrentWeek = startDate === getCurrentWeekStartIsoDate();
  const observedDays = (trackerMetrics?.daily || []).filter(
    (row) => row?.date,
  ).length;
  const evaluatedDays = Math.max(
    trackerMetrics?.evaluated_days ?? 0,
    observedDays,
  );
  const totalDays = Math.max(trackerMetrics?.total_days ?? 7, evaluatedDays, 1);
  const weekPhase = trackerMetrics?.week_phase;
  const hasTrackedEntries = (trackerMetrics?.daily || []).some(
    (row) => (row?.done ?? 0) + (row?.missed ?? 0) > 0,
  );
  const isFirstWeek = trackerMetrics?.baseline_date === startDate;
  const hasEvaluatedWindow = weekPhase !== "future" && evaluatedDays > 0;

  const weekProgressLabel =
    weekPhase === "future"
      ? "Semana aún no inicia"
      : `Día ${Math.min(evaluatedDays, totalDays)} de ${totalDays}`;
  const progressPercent =
    weekPhase === "future"
      ? 0
      : Math.max(
          0,
          Math.min(100, Math.round((evaluatedDays / totalDays) * 100)),
        );

  const orderedActiveIds = useMemo(() => {
    const activeIds = data
      .filter((habit) => !habit.removal_effective_date)
      .map((habit) => habit.habit_id);
    const keep = activeOrder.filter((id) => activeIds.includes(id));
    const missing = activeIds.filter((id) => !keep.includes(id));
    return [...keep, ...missing];
  }, [data, activeOrder]);

  const orderedHabits = useMemo(() => {
    const activeHabits = data.filter((habit) => !habit.removal_effective_date);
    const pendingHabits = data.filter((habit) => habit.removal_effective_date);

    const activeIndex = new Map(
      orderedActiveIds.map((id, index) => [id, index]),
    );
    activeHabits.sort((a, b) => {
      const aIdx = activeIndex.has(a.habit_id)
        ? activeIndex.get(a.habit_id)
        : Number.MAX_SAFE_INTEGER;
      const bIdx = activeIndex.has(b.habit_id)
        ? activeIndex.get(b.habit_id)
        : Number.MAX_SAFE_INTEGER;
      return aIdx - bIdx;
    });

    return [...activeHabits, ...pendingHabits];
  }, [data, orderedActiveIds]);

  useEffect(() => {
    // Avoid clobbering persisted order with transient empty state while loading.
    if (loading || orderedActiveIds.length === 0) return;
    saveHabitOrder(storageNamespace, orderedActiveIds);
  }, [orderedActiveIds, storageNamespace, loading]);

  useEffect(() => {
    setActiveOrder(loadHabitOrder(storageNamespace));
  }, [storageNamespace]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-6 shadow-sm">
        <LoadingSpinner label="Cargando hábitos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 text-red-500 dark:bg-red-950/40 dark:border-red-700 p-6 shadow-sm">
        {error}
      </div>
    );
  }

  const handleSubmit = async (habitData) => {
    let res;

    if (editingHabit) {
      res = await handleEdit(editingHabit.habit_id, habitData);
      if (res.success) {
        showToast(
          "Cambios guardados. Se aplicarán desde el lunes de la próxima semana.",
          "success",
        );
      } else {
        showToast(res.message || "No pudimos actualizarlo", "error");
      }
    } else {
      res = await handleCreate(habitData);
      if (res.success) {
        showToast(
          "Hábito creado. Empezará a contar desde el lunes de la próxima semana.",
          "success",
        );
      } else {
        showToast(res.message || "No pudimos crearlo", "error");
      }
    }

    if (res?.success) {
      setShowModal(false);
      setEditingHabit(null);
    }

    return res;
  };

  const confirmDelete = async () => {
    const res = await handleDelete(deleteId);

    if (res.success) {
      showToast(
        "Hábito programado para eliminarse desde el lunes de la próxima semana.",
        "success",
      );
    } else {
      showToast(res.message || "No pudimos eliminarlo", "error");
    }

    setDeleteId(null);
  };

  const handleHabitUpdate = async (...args) => {
    const [, , currentStatus] = args;
    const result = await handleUpdate(...args);

    if (result?.success && currentStatus === "pending") {
      const randomMessage =
        DONE_FEEDBACK_MESSAGES[
          Math.floor(Math.random() * DONE_FEEDBACK_MESSAGES.length)
        ];
      showToast(randomMessage, "success");
      return;
    }

    if (!result?.success) {
      showToast(
        result?.message || "No pudimos actualizar el estado del hábito",
        result?.type || "error",
      );
    }
  };

  const handleEditIntent = (habit) => {
    if (habit.removal_effective_date) {
      showToast("Este hábito ya fue eliminado.", "error");
      return;
    }
    if (!canManageHabits) {
      showToast("Solo puedes editar o eliminar hábitos en domingo.", "error");
      return;
    }
    setEditingHabit({
      ...habit,
      days: Array.isArray(habit.editable_days)
        ? habit.editable_days
        : habit.days,
    });
    setShowModal(true);
  };

  const handleDeleteIntent = (habit) => {
    if (habit.removal_effective_date) {
      showToast("Este hábito ya fue eliminado.", "error");
      return;
    }
    if (!canManageHabits) {
      showToast("Solo puedes editar o eliminar hábitos en domingo.", "error");
      return;
    }
    setDeleteId(habit.habit_id);
  };

  const activeHabits = orderedHabits.filter(
    (habit) => !habit.removal_effective_date,
  );
  const hasNoWeeklyRecords =
    orderedHabits.length > 0 && hasEvaluatedWindow && !hasTrackedEntries;

  const openOrderModal = () => {
    setDraftOrder([...orderedActiveIds]);
    setShowOrderModal(true);
  };

  const moveDraftOrder = (habitId, direction) => {
    const currentOrder = [...draftOrder];
    const index = currentOrder.indexOf(habitId);
    if (index < 0) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    [currentOrder[index], currentOrder[targetIndex]] = [
      currentOrder[targetIndex],
      currentOrder[index],
    ];
    setDraftOrder(currentOrder);
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 dark:bg-slate-900/80 dark:border-slate-700 p-3 sm:p-4 md:p-6 shadow-sm overflow-hidden">
      <div className="mb-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-linear-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-3 sm:p-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Seguimiento
            </p>
            <h2 className="text-xl font-semibold mt-1">Seguimiento semanal</h2>
          </div>

          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2">
            {refreshing && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-200 animate-spin" />
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  Actualizando...
                </span>
              </div>
            )}

            <button
              onClick={() => {
                setEditingHabit(null);
                setShowModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 hover:opacity-90 cursor-pointer"
            >
              Nuevo hábito
            </button>

            {activeHabits.length > 1 && (
              <button
                onClick={openOrderModal}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Ordenar hábitos
              </button>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${!isCurrentWeek ? "max-w-40 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2 pointer-events-none"}`}
            >
              <button
                onClick={goToCurrentWeek}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                Semana actual
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 p-1 bg-slate-100/70 dark:bg-slate-800/70">
              <button
                onClick={() => changeWeek(-1)}
                disabled={!canGoPrev}
                title={
                  canGoPrev
                    ? "Ir a la semana anterior"
                    : "No puedes ir antes de tu primera semana"
                }
                aria-label={
                  canGoPrev
                    ? "Ir a la semana anterior"
                    : "Semana anterior no disponible"
                }
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ←
              </button>

              <button
                onClick={() => changeWeek(1)}
                disabled={!canGoNext}
                title="Ir a la semana siguiente"
                aria-label="Ir a la semana siguiente"
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-300 mt-3">
          Semana del {startDate}
        </p>
        <div className="mt-2 max-w-md space-y-1.5">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {weekProgressLabel}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Avance de la semana (tiempo)
          </p>
          <div
            className="h-1 rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden"
            title="Esta barra muestra en qué día de la semana estás, no el cumplimiento de hábitos."
          >
            <div
              className="h-full rounded-full bg-slate-500 dark:bg-slate-300 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              aria-label={`Avance semanal ${progressPercent}%`}
            />
          </div>
        </div>
      </div>

      <div
        className={`transition-opacity duration-200 ${refreshing ? "opacity-65" : "opacity-100"}`}
      >
        {orderedHabits.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-5 text-center">
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              Aún no tienes hábitos activos esta semana.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
              Crea tu primer hábito para empezar a ver progreso diario, rachas e
              insights.
            </p>
          </div>
        ) : (
          <>
            {weekPhase === "future" && (
              <div className="mb-4 rounded-xl border border-sky-200 dark:border-sky-800/70 bg-sky-50/80 dark:bg-sky-950/20 px-4 py-3">
                <p className="text-sm text-sky-900 dark:text-sky-200">
                  Estás viendo una semana futura. Los hábitos se habilitarán
                  cuando llegue esa fecha.
                </p>
              </div>
            )}

            {hasNoWeeklyRecords && (
              <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
                <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                  {isFirstWeek && evaluatedDays <= 1
                    ? "Primer día de uso: aún no hay actividad registrada"
                    : "Semana sin registros todavía"}
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300 mt-1">
                  {isFirstWeek && evaluatedDays <= 1
                    ? "Empieza con un hábito sencillo hoy para construir inercia desde el inicio."
                    : "Marca al menos un hábito hoy para desbloquear recomendaciones más precisas."}
                </p>
              </div>
            )}

            <div className="lg:hidden space-y-3">
              {orderedHabits.map((habit) => (
                <HabitCardMobile
                  key={`mobile-${habit.habit_id}`}
                  habit={habit}
                  dates={dates}
                  canManageHabits={canManageHabits}
                  onUpdate={handleHabitUpdate}
                  onEdit={handleEditIntent}
                  onDelete={handleDeleteIntent}
                />
              ))}
            </div>

            <div className="hidden lg:block max-w-full overflow-x-auto pb-1">
              <table
                className="w-full text-center border-separate border-spacing-y-2"
                style={{ minWidth: "860px" }}
              >
                <thead>
                  <tr>
                    <th className="text-left px-2 sm:px-3 py-2 min-w-40 sm:min-w-52 text-slate-500 text-sm font-medium">
                      Hábito
                    </th>

                    {dates.map((d) => (
                      <th
                        key={d}
                        className="w-12 sm:w-14 md:w-16 cursor-default text-slate-500 text-sm font-medium py-2"
                      >
                        <div className="leading-tight">
                          <p className="font-semibold text-slate-700 dark:text-slate-200 text-[12px]">
                            {getIsoDayNameLong(d)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {getIsoDateLabel(d)}
                          </p>
                        </div>
                      </th>
                    ))}

                    <th className="text-slate-500 text-sm font-medium">
                      Racha
                    </th>
                    <th className="text-slate-500 text-sm font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orderedHabits.map((habit) => {
                    return (
                      <HabitRow
                        key={habit.habit_id}
                        habit={habit}
                        dates={dates}
                        canManageHabits={canManageHabits}
                        onUpdate={handleHabitUpdate}
                        onEdit={handleEditIntent}
                        onDelete={handleDeleteIntent}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {(showModal || editingHabit) && (
        <HabitModal
          key={`${editingHabit?.habit_id ?? "new"}-${showModal ? "open" : "closed"}`}
          open={showModal || !!editingHabit}
          onClose={() => {
            setShowModal(false);
            setEditingHabit(null);
          }}
          onSubmit={handleSubmit}
          initialData={editingHabit}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        text="¿Seguro que quieres eliminar este hábito?"
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <HabitOrderModal
        open={showOrderModal}
        habits={activeHabits}
        order={draftOrder}
        onMove={moveDraftOrder}
        onClose={() => {
          setShowOrderModal(false);
          setDraftOrder([]);
        }}
        onSave={() => {
          setActiveOrder(draftOrder);
          setShowOrderModal(false);
          setDraftOrder([]);
          showToast("Orden actualizado", "success");
        }}
      />

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <TrackerInsights metrics={trackerMetrics} />
    </div>
  );
}
