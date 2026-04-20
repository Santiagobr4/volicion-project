import {
  buttonClassName,
  modalBackdropClassName,
  modalPanelClassName,
} from "./ui.js";

export default function HabitOrderModal({
  open,
  habits,
  order,
  onMove,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className={modalBackdropClassName}>
      <div className={`${modalPanelClassName} max-w-lg p-5`}>
        <h3 className="text-lg font-semibold">Ordenar hábitos</h3>
        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1 mb-4">
          Reordena tus hábitos activos y guarda los cambios.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {order.map((habitId, index) => {
            const habit = habits.find((item) => item.habit_id === habitId);
            if (!habit) return null;

            return (
              <div
                key={habitId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-3 py-2"
              >
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {habit.name}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMove(habitId, -1)}
                    disabled={index === 0}
                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(habitId, 1)}
                    disabled={index === order.length - 1}
                    className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Mover abajo"
                  >
                    ↓
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            Guardar orden
          </button>
        </div>
      </div>
    </div>
  );
}
