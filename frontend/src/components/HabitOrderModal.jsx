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
        <h3 className="font-serif text-[28px] leading-tight">Ordenar hábitos</h3>
        <p className="text-sm text-ink-3 mt-1 mb-4">
          Reordena tus hábitos activos y guarda los cambios.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {order.map((habitId, index) => {
            const habit = habits.find((item) => item.habit_id === habitId);
            if (!habit) return null;

            return (
              <div
                key={habitId}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-ink/10 bg-paper-2 px-3 py-2"
              >
                <p className="text-sm font-medium truncate">{habit.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onMove(habitId, -1)}
                    disabled={index === 0}
                    className="w-8 h-8 rounded-full border border-ink/15 text-xs hover:bg-paper-3 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover arriba"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(habitId, 1)}
                    disabled={index === order.length - 1}
                    className="w-8 h-8 rounded-full border border-ink/15 text-xs hover:bg-paper-3 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
            className={buttonClassName({ variant: "ghost", size: "sm" })}
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
