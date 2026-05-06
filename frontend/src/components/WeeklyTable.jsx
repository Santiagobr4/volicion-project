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
import { buttonClassName, eyebrowClassName } from "./ui.js";

const DONE_FEEDBACK_MESSAGES = [
  "Buen trabajo. Sumaste otro check a tu semana.",
  "Excelente. Sigues construyendo constancia.",
  "¡Hecho! Un paso más hacia tu mejor racha.",
  "Muy bien. Mantener el ritmo es lo que cuenta.",
];

export default function WeeklyTable({ onDataChanged, storageNamespace, user }) {
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
  const weekPhase = trackerMetrics?.week_phase;
  const hasTrackedEntries = (trackerMetrics?.daily || []).some(
    (row) => (row?.done ?? 0) + (row?.missed ?? 0) > 0,
  );
  const isFirstWeek = trackerMetrics?.baseline_date === startDate;
  const hasEvaluatedWindow = weekPhase !== "future" && evaluatedDays > 0;

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

  const activeHabits = orderedHabits.filter((h) => !h.removal_effective_date);
  const showActionsColumn = canManageHabits || orderedHabits.some((h) => h.removal_effective_date);
  const todayDone = trackerMetrics?.focus?.done ?? 0;
  const todayTotal = trackerMetrics?.focus?.total ?? 0;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const weekCompletion = trackerMetrics?.week?.completion;
  const bestStreak = orderedHabits.reduce((max, h) => Math.max(max, h.streak_best || 0), 0);

  const now = new Date();
  const _d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  _d.setUTCDate(_d.getUTCDate() + 4 - (_d.getUTCDay() || 7));
  const _yearStart = new Date(Date.UTC(_d.getUTCFullYear(), 0, 1));
  const weekNumToday = Math.ceil(((_d - _yearStart) / 86400000 + 1) / 7);
  const weekday = new Intl.DateTimeFormat("es-419", { weekday: "short" }).format(now).replace(".", "").toUpperCase();
  const dayNum = String(now.getDate()).padStart(2, "0");
  const monthName = new Intl.DateTimeFormat("es-419", { month: "long" }).format(now).toUpperCase();
  const dateEyebrow = `${weekday} · ${dayNum} · ${monthName} · ${now.getFullYear()} · SEMANA ${weekNumToday}`;

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 pt-6 pb-10">

      {/* Greeting + today widget */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
        <div className="min-w-0">
          <span className={eyebrowClassName}>
            {dateEyebrow}
          </span>
          <h1 className="font-serif text-[length:var(--text-h1)] leading-[0.98] tracking-[-0.02em] mt-3" style={{ marginBottom: 0 }}>
            Hola, <em className="text-ink-3 italic">{user || "ahí"}.</em><br />
            Hoy toca{" "}
            <span style={{ borderBottom: "3px solid var(--lime)", paddingBottom: 2 }}>cumplir.</span>
          </h1>
        </div>
        <div className="flex flex-col md:items-end gap-2 shrink-0">
          <span className={eyebrowClassName}>Hoy</span>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[48px] sm:text-[64px] leading-none">{todayDone}</span>
            <span className="text-[16px] sm:text-[18px] text-ink-3">/ {todayTotal} hábitos</span>
          </div>
          <div className="w-full md:w-[200px] h-[4px] bg-paper-3 rounded-full overflow-hidden">
            <div className="h-full bg-lime rounded-full transition-[width] duration-300" style={{ width: `${todayPct}%` }} />
          </div>
        </div>
      </div>

      {/* Stats + actions row */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-end md:justify-between gap-5 mb-6 pt-6 border-t border-ink/10">
        <div className="grid grid-cols-3 gap-6 sm:gap-10">
          <div>
            <p className="font-mono text-[10px] sm:text-[11px] tracking-[0.10em] sm:tracking-[0.12em] uppercase text-ink-3 mb-2">Racha mejor</p>
            <p className="font-serif text-[28px] sm:text-[36px] lg:text-[44px] leading-[0.9]">
              {bestStreak}<span className="text-[14px] sm:text-[18px] text-ink-3 ml-1.5">días</span>
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] sm:text-[11px] tracking-[0.10em] sm:tracking-[0.12em] uppercase text-ink-3 mb-2">Cumplimiento semanal</p>
            <p className="font-serif text-[28px] sm:text-[36px] lg:text-[44px] leading-[0.9]">
              {weekCompletion !== null && weekCompletion !== undefined
                ? <>{weekCompletion}<span className="text-[16px] sm:text-[24px] text-ink-3">%</span></>
                : <span className="text-ink-4">—</span>}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] sm:text-[11px] tracking-[0.10em] sm:tracking-[0.12em] uppercase text-ink-3 mb-2">Hábitos activos</p>
            <p className="font-serif text-[28px] sm:text-[36px] lg:text-[44px] leading-[0.9]">{activeHabits.length}</p>
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
            className={buttonClassName({ variant: "ghost", size: "sm" })}
          >
            + Nuevo hábito
          </button>

          {activeHabits.length > 1 && (
            <button onClick={openOrderModal} className={buttonClassName({ variant: "ghost", size: "sm" })}>
              Reordenar
            </button>
          )}

          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              className={`${buttonClassName({ variant: "ghost", size: "sm" })} fade-up`}
            >
              Semana actual
            </button>
          )}

          <div className="inline-flex rounded-full border border-ink/10 overflow-hidden">
            <button
              onClick={() => changeWeek(-1)}
              disabled={!canGoPrev}
              title={canGoPrev ? "Ir a la semana anterior" : "No puedes ir antes de tu primera semana"}
              aria-label={canGoPrev ? "Ir a la semana anterior" : "Semana anterior no disponible"}
              className="w-11 h-11 flex items-center justify-center hover:bg-paper-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-inset"
            >←</button>
            <span className="w-[1px] bg-ink/10 self-stretch" />
            <button
              onClick={() => changeWeek(1)}
              disabled={!canGoNext}
              title="Ir a la semana siguiente"
              aria-label="Ir a la semana siguiente"
              className="w-11 h-11 flex items-center justify-center hover:bg-paper-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-inset"
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
              <div className="mb-6 border-l-2 border-gold pl-4 py-1">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-gold mb-1.5">
                  {isFirstWeek && evaluatedDays <= 1 ? "Primer día" : "Semana sin actividad"}
                </p>
                <p className="font-serif text-[18px] leading-[1.3] text-ink">
                  {isFirstWeek && evaluatedDays <= 1
                    ? "Aún sin registros. Empieza con un hábito sencillo hoy."
                    : "Marca un hábito hoy para abrir recomendaciones más precisas."}
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
            <div className="hidden lg:block max-w-full overflow-x-auto pb-1 border-t border-ink/22">
              <table
                className="w-full text-center"
                style={{ minWidth: "860px" }}
              >
                <thead>
                  <tr className="border-b border-ink/8">
                    <th className="text-left px-3 py-3 min-w-52 font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 font-normal">
                      Hábito
                    </th>
                    {dates.map((d) => {
                      const isToday = d === new Date().toISOString().slice(0, 10);
                      return (
                        <th key={d} className="py-3 font-mono text-[10px] tracking-[0.06em] uppercase font-normal">
                          <div className="leading-tight">
                            <p className={isToday ? "text-ink font-medium" : "text-ink-4"}>{getIsoDayNameLong(d)}</p>
                            <p className={isToday ? "text-ink-3" : "text-ink-4 opacity-70"}>{getIsoDateLabel(d)}</p>
                          </div>
                        </th>
                      );
                    })}
                    <th className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 font-normal text-right pr-3">
                      Racha
                    </th>
                    {showActionsColumn && (
                      <th className="font-mono text-[11px] tracking-[0.10em] uppercase text-ink-3 font-normal text-right pr-2">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {orderedHabits.map((habit) => (
                    <HabitRow
                      key={habit.habit_id}
                      habit={habit}
                      dates={dates}
                      canManageHabits={canManageHabits}
                      showActionsColumn={showActionsColumn}
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
