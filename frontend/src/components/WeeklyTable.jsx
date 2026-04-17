import { useState } from "react";
import { useHabits } from "../hooks/useHabits";
import HabitRow from "./HabitRow";
import HabitCardMobile from "./HabitCardMobile";
import HabitModal from "./HabitModal";
import ConfirmDialog from "./ConfirmDialog";
import TrackerInsights from "./TrackerInsights";
import Toast from "./Toast";
import { getIsoDateLabel, getIsoDayNameLong } from "../utils/dateLabels";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Weekly tracker table that coordinates CRUD actions, status updates, and insights.
 */
export default function WeeklyTable({ onDataChanged }) {
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
  const [editingHabit, setEditingHabit] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const canManageHabits = new Date().getDay() === 0;

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
        showToast("Hábito actualizado", "success");
      } else {
        showToast(res.message || "No pudimos actualizarlo", "error");
      }
    } else {
      res = await handleCreate(habitData);
      if (res.success) {
        showToast("Hábito creado", "success");
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
      showToast("Hábito eliminado", "success");
    } else {
      showToast(res.message || "No pudimos eliminarlo", "error");
    }

    setDeleteId(null);
  };

  const handleHabitUpdate = async (...args) => {
    const result = await handleUpdate(...args);
    if (!result?.success) {
      showToast(
        result?.message || "No pudimos actualizar el estado del hábito",
        result?.type || "error",
      );
    }
  };

  const handleEditIntent = (habit) => {
    if (!canManageHabits) {
      showToast("Solo puedes editar o eliminar hábitos en domingo.", "error");
      return;
    }
    setEditingHabit(habit);
    setShowModal(true);
  };

  const handleDeleteIntent = (habit) => {
    if (!canManageHabits) {
      showToast("Solo puedes editar o eliminar hábitos en domingo.", "error");
      return;
    }
    setDeleteId(habit.habit_id);
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

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${canGoNext ? "max-w-40 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2 pointer-events-none"}`}
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
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-300 mt-3">
          Semana del {startDate}
        </p>
      </div>

      <div
        className={`transition-opacity duration-200 ${refreshing ? "opacity-65" : "opacity-100"}`}
      >
        {data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-5 text-center">
            <p className="text-slate-600 dark:text-slate-300">
              Aún no tienes hábitos. Crea uno para empezar.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {data.map((habit) => (
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

            <div className="hidden md:block max-w-full overflow-x-auto pb-1">
              <table className="w-full text-center border-separate border-spacing-y-2 min-w-[760px] lg:min-w-[920px]">
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
                  {data.map((habit) => (
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

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <TrackerInsights metrics={trackerMetrics} />
    </div>
  );
}
