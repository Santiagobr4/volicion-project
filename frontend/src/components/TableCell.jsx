import { getSymbol, getStatusStyle } from "../utils/habitHelpers";

const sizeClass = "w-12 h-12 sm:w-14 sm:h-14 rounded-[10px]";

export default function TableCell({
  status,
  onClick,
  isFuture = false,
  isToday = false,
  isScheduled = true,
}) {
  // Day not scheduled for this habit: muted, non-interactive marker.
  if (!isScheduled) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center bg-paper-2 border border-dashed border-ink/10 text-ink-4 text-xs select-none`}
        aria-label="No aplica este día"
        title="Este hábito no aplica este día"
      >
        ·
      </div>
    );
  }

  if (isFuture) {
    return (
      <div
        className={`${sizeClass} day-cell-future border border-ink/15`}
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

  const todayPendingStyle = isToday && status === "pending"
    ? "bg-paper border-2 border-ink text-ink"
    : "";

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
      className={`${sizeClass} flex items-center justify-center font-mono tracking-[0.06em] transition-[transform,opacity] duration-200 focus:outline-none focus:ring-2 focus:ring-ink/20 ${
        isToday && status === "pending" ? "text-[10px]" : "text-sm"
      } ${
        isDisabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:opacity-75 active:scale-95"
      } ${todayPendingStyle || getStatusStyle(status)}`}
    >
      {isToday && status === "pending" ? "HOY" : getSymbol(status)}
    </button>
  );
}
