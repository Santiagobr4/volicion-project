import Dialog from "./Dialog";
import { buttonClassName } from "./ui.js";

export default function ConfirmDialog({ open, onClose, onConfirm, text }) {
  return (
    <Dialog open={open} onClose={onClose} title="Confirmar acción" panelClassName="max-w-sm p-5 sm:p-6">
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
    </Dialog>
  );
}
