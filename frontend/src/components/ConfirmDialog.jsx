export default function ConfirmDialog({ open, onClose, onConfirm, text }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-[320px]">
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
