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
import { buttonClassName } from "./ui.js";

const DONE_FEEDBACK_MESSAGES = [
  "Buen trabajo. Sumaste otro check a tu semana.",
  "Excelente. Sigues construyendo constancia.",
  "¡Hecho! Un paso más hacia tu mejor racha.",
  "Muy bien. Mantener el ritmo es lo que cuenta.",
];

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
  const [activeOrder, setActiveOrder] = useState(() => loadHabitOrder(storageNamespace));
  const canManageHabits = new Date().getDay() === 0;
  const [draftOrder, setDraftOrder] = useState([]);
  const isCurrentWeek = startDate === getCurrentWeekStartIsoDate();
  const observedDays = (trackerMetrics?.daily || []).filter((row) => row?.date).length;
  const evaluatedDays = Math.max(trackerMetrics?.evaluated_days ?? 0, observedDays);
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
      : Math.max(0, Math.min(100, Math.round((evaluatedDays / totalDays) * 100)));

  const orderedActiveIds = useMemo(() => {
    const activeIds = data.filter((h) => !h.removal_effective_date).map((h) => h.habit_id);
    const keep = activeOrder.filter((id) => activeIds.includes(id));
    const missing = activeIds.filter((id) => !keep.includes(id));
    return [...keep, ...missing];
  }, [data, activeOrder]);

  const orderedHabits = useMemo(() => {
    const activeHabits = data.filter((h) => !h.removal_effective_date);
    const pendingHabits = data.filter((h) => h.removal_effective_date);
    const activeIndex = new Map(orderedActiveIds.map((id, i) => [id, i]));
    activeHabits.sort((a, b) => {
      const ai = activeIndex.has(a.habit_id) ? activeIndex.get(a.habit_id) : Number.MAX_SAFE_INTEGER;
      const bi = activeIndex.has(b.habit_id) ? activeIndex.get(b.habit_id) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    return [...activeHabits, ...pendingHabits];
  }, [data, orderedActiveIds]);

  useEffect(() => {
    if (loading || orderedActiveIds.length === 0) return;
    saveHabitOrder(storageNamespace, orderedActiveIds);
  }, [orderedActiveIds, storageNamespace, loading]);

  useEffect(() => {
    setActiveOrder(loadHabitOrder(storageNamespace));
  }, [storageNamespace]);

  const showToast = (message, type = "info") => setToast({ message, type });

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <LoadingSpinner label="Cargando hábitos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <div className="rounded-[14px] border border-signal/25 bg-signal-soft px-4 py-3 text-sm text-signal">
          {error}
        </div>
      </div>
    );
  }

  const handleSubmit = async (habitData) => {
    let res;
    if (editingHabit) {
      res = await handleEdit(editingHabit.habit_id, habitData);
      if (res.success) {
        showToast("Cambios guardados. Se aplicarán desde el lunes de la próxima semana.", "success");
      } else {
        showToast(res.message || "No pudimos actualizarlo", "error");
      }
    } else {
      res = await handleCreate(habitData);
      if (res.success) {
        showToast("Hábito creado. Empezará a contar desde el lunes de la próxima semana.", "success");
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
      showToast("Hábito programado para eliminarse desde el lunes de la próxima semana.", "success");
    } else {
      showToast(res.message || "No pudimos eliminarlo", "error");
    }
    setDeleteId(null);
  };

  const handleHabitUpdate = async (...args) => {
    const [, , currentStatus] = args;
    const result = await handleUpdate(...args);
    if (result?.success && currentStatus === "pending") {
      showToast(DONE_FEEDBACK_MESSAGES[Math.floor(Math.random() * DONE_FEEDBACK_MESSAGES.length)], "success");
      return;
    }
    if (!result?.success) {
      showToast(result?.message || "No pudimos actualizar el estado del hábito", result?.type || "error");
    }
  };

  const handleEditIntent = (habit) => {
    if (habit.removal_effective_date) { showToast("Este hábito ya fue eliminado.", "error"); return; }
    if (!canManageHabits) { showToast("Solo puedes editar o eliminar hábitos en domingo.", "error"); return; }
    setEditingHabit({ ...habit, days: Array.isArray(habit.editable_days) ? habit.editable_days : habit.days });
    setShowModal(true);
  };

  const handleDeleteIntent = (habit) => {
    if (habit.removal_effective_date) { showToast("Este hábito ya fue eliminado.", "error"); return; }
    if (!canManageHabits) { showToast("Solo puedes editar o eliminar hábitos en domingo.", "error"); return; }
    setDeleteId(habit.habit_id);
  };

  const activeHabits = orderedHabits.filter((h) => !h.removal_effective_date);
  const hasNoWeeklyRecords = orderedHabits.length > 0 && hasEvaluatedWindow && !hasTrackedEntries;

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
    [currentOrder[index], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[index]];
    setDraftOrder(currentOrder);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">

      {/* Section header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-4">
            Seguimiento semanal
          </span>
          <div className="flex flex-wrap items-baseline gap-3 mt-1">
            <p className="font-serif text-[32px] leading-tight tracking-[-0.02em]">
              {weekProgressLabel}
            </p>
            <p className="font-mono text-[12px] text-ink-3">
              Semana del {startDate}
            </p>
          </div>
          <div className="mt-3 max-w-[200px]">
            <div
              className="h-[2px] bg-paper-3 rounded-full overflow-hidden"
              title={`Avance semanal: ${progressPercent}% del tiempo transcurrido`}
            >
              <div
                className="h-full bg-ink rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {refreshing && (
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-ink/10 bg-paper-2 font-mono text-[11px] text-ink-3">
              <span className="w-2.5 h-2.5 rounded-full border border-ink/25 border-t-ink animate-spin" />
              Actualizando
            </span>
          )}

          <button
            onClick={() => { setEditingHabit(null); setShowModal(true); }}
            className={buttonClassName({ variant: "primary" })}
          >
            + Nuevo hábito
          </button>

          {activeHabits.length > 1 && (
            <button onClick={openOrderModal} className={buttonClassName({ variant: "secondary" })}>
              Ordenar
            </button>
          )}

          <div className={`overflow-hidden transition-all duration-300 ${!isCurrentWeek ? "max-w-40 opacity-100" : "max-w-0 opacity-0 pointer-events-none"}`}>
            <button onClick={goToCurrentWeek} className={buttonClassName({ variant: "ghost" })}>
              Semana actual
            </button>
          </div>

          <div className="inline-flex rounded-full border border-ink/10 overflow-hidden">
            <button
              onClick={() => changeWeek(-1)}
              disabled={!canGoPrev}
              title={canGoPrev ? "Ir a la semana anterior" : "No puedes ir antes de tu primera semana"}
              aria-label={canGoPrev ? "Ir a la semana anterior" : "Semana anterior no disponible"}
              className="w-9 h-9 flex items-center justify-center hover:bg-paper-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >←</button>
            <span className="w-[1px] bg-ink/10 self-stretch" />
            <button
              onClick={() => changeWeek(1)}
              disabled={!canGoNext}
              title="Ir a la semana siguiente"
              aria-label="Ir a la semana siguiente"
              className="w-9 h-9 flex items-center justify-center hover:bg-paper-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >→</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`transition-opacity duration-200 ${refreshing ? "opacity-60" : "opacity-100"}`}>
        {orderedHabits.length === 0 ? (
          <div className="rounded-[18px] border border-ink/10 bg-paper-2 p-8 text-center">
            <p className="font-serif text-[28px] leading-tight text-ink-2">
              Todavía no hay hábitos esta semana.
            </p>
            <p className="text-sm text-ink-3 mt-2 max-w-sm mx-auto leading-relaxed">
              Crea tu primer hábito para empezar a ver progreso diario, rachas e insights.
            </p>
          </div>
        ) : (
          <>
            {weekPhase === "future" && (
              <div className="mb-4 rounded-[10px] border border-ink/10 bg-paper-2 px-4 py-3">
                <p className="text-sm text-ink-3">
                  Estás viendo una semana futura. Los hábitos se habilitarán cuando llegue esa fecha.
                </p>
              </div>
            )}

            {hasNoWeeklyRecords && (
              <div className="mb-4 rounded-[10px] border border-gold/30 bg-gold/8 px-4 py-3">
                <p className="text-sm font-medium">
                  {isFirstWeek && evaluatedDays <= 1
                    ? "Primer día de uso: aún no hay actividad registrada"
                    : "Semana sin registros todavía"}
                </p>
                <p className="text-xs text-ink-3 mt-1">
                  {isFirstWeek && evaluatedDays <= 1
                    ? "Empieza con un hábito sencillo hoy para construir inercia desde el inicio."
                    : "Marca al menos un hábito hoy para desbloquear recomendaciones más precisas."}
                </p>
              </div>
            )}

            {/* Mobile */}
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

            {/* Desktop table */}
            <div className="hidden lg:block max-w-full overflow-x-auto pb-1">
              <table
                className="w-full text-center border-separate border-spacing-y-1.5"
                style={{ minWidth: "860px" }}
              >
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 min-w-52 font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                      Hábito
                    </th>
                    {dates.map((d) => (
                      <th key={d} className="w-14 py-2 font-mono text-[10px] tracking-[0.06em] uppercase text-ink-4">
                        <div className="leading-tight">
                          <p>{getIsoDayNameLong(d)}</p>
                          <p className="opacity-50">{getIsoDateLabel(d)}</p>
                        </div>
                      </th>
                    ))}
                    <th className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                      Racha
                    </th>
                    <th className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-4">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderedHabits.map((habit) => (
                    <HabitRow
                      key={habit.habit_id}
                      habit={habit}
                      dates={dates}
                      canManageHabits={canManageHabits}
                      onUpdate={handleHabitUpdate}
                      onEdit={handleEditIntent}
                      onDelete={handleDeleteIntent}
                    />
                  ))}
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
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
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
        onClose={() => { setShowOrderModal(false); setDraftOrder([]); }}
        onSave={() => {
          setActiveOrder(draftOrder);
          setShowOrderModal(false);
          setDraftOrder([]);
          showToast("Orden actualizado", "success");
        }}
      />

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <TrackerInsights metrics={trackerMetrics} />
    </div>
  );
}
