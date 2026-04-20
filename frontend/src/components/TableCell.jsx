import { getSymbol, getStatusStyle } from "../utils/habitHelpers";

/**
 * Interactive status cell for the weekly tracker table.
 *
 * Props:
 * - status: current status string for the day.
 * - onClick: callback to rotate status.
 */
export default function TableCell({ status, onClick, isFuture = false }) {
  if (isFuture) {
    return (
      <div
        className="w-10 h-9 sm:w-12 sm:h-10 rounded-lg flex items-center justify-center border border-dashed border-slate-300 bg-slate-100/80 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
        aria-label="Día futuro"
        title="Día futuro"
      >
        <span className="text-sm sm:text-base">—</span>
      </div>
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
      className={`w-10 h-9 sm:w-12 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-base shadow-sm transition-[transform,background-color,color,box-shadow] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 ${
        isDisabled
          ? "cursor-not-allowed opacity-80"
          : "cursor-pointer hover:scale-[1.01] active:scale-[0.985]"
      } ${getStatusStyle(status)}`}
    >
      {getSymbol(status)}
    </button>
  );
}
