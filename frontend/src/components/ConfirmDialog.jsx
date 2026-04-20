export default function ConfirmDialog({ open, onClose, onConfirm, text }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 px-3">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Confirmar acción</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
          {text}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer"
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  );
}
