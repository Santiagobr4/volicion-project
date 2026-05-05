import {
  buttonClassName,
  modalBackdropClassName,
  modalPanelClassName,
} from "./ui.js";

export default function ConfirmDialog({ open, onClose, onConfirm, text }) {
  if (!open) return null;

  return (
    <div className={modalBackdropClassName}>
      <div className={`${modalPanelClassName} max-w-sm p-5 sm:p-6`}>
        <h2 className="font-serif text-[28px] leading-tight">Confirmar acción</h2>
        <p className="text-sm text-ink-3 mt-2">{text}</p>

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
            onClick={onConfirm}
            className={buttonClassName({ variant: "danger", size: "sm" })}
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  );
}
