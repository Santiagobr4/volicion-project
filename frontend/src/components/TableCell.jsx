import { getSymbol, getStatusStyle } from "../utils/habitHelpers";

/**
 * Interactive status cell for the weekly tracker table.
 *
 * Props:
 * - status: current status string for the day.
 * - onClick: callback to rotate status.
 */
export default function TableCell({ status, onClick }) {
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
      className={`w-12 h-10 rounded-lg flex items-center justify-center transition shadow-sm ${
        isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-105"
      } ${getStatusStyle(status)}`}
    >
      {getSymbol(status)}
    </button>
  );
}
