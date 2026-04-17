export default function ConfirmDialog({ open, onClose, onConfirm, text }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">{text}</h2>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-gray-300 rounded">
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="px-3 py-2 bg-red-500 text-white rounded"
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  );
}
