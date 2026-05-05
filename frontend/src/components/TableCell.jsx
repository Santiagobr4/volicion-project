import { getSymbol, getStatusStyle } from "../utils/habitHelpers";

export default function TableCell({ status, onClick, isFuture = false }) {
  if (isFuture) {
    return (
      <div
        className="w-10 h-9 sm:w-12 sm:h-10 rounded-[8px] day-cell-future border border-dashed border-ink/15"
        aria-label="Día futuro"
        title="Día futuro"
      />
    );
  }

  const isDisabled = status === "skip";
  const statusLabel = {
    pending: "pendiente",
    done: "completado",
    missed: "omitido",
    skip: "no aplica",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={
        isDisabled
          ? "Día no aplicable"
          : `Actualizar estado: ${statusLabel[status] || status}`
      }
      className={`w-10 h-9 sm:w-12 sm:h-10 rounded-[8px] flex items-center justify-center text-sm font-mono transition-[transform,opacity] duration-200 focus:outline-none focus:ring-2 focus:ring-ink/20 ${
        isDisabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:opacity-75 active:scale-95"
      } ${getStatusStyle(status)}`}
    >
      {getSymbol(status)}
    </button>
  );
}
