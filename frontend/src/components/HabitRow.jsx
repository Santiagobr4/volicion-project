import TableCell from "./TableCell";
import { formatCompactDate, getIsoDayNameShort } from "../utils/dateLabels";
import { isFutureIsoDate } from "../utils/dateUtils";

export default function HabitRow({
  habit,
  dates,
  onUpdate,
  onEdit,
  onDelete,
  canManageHabits = true,
}) {
  const canShowActions = !habit.removal_effective_date;
  const removalMessage = (() => {
    if (!habit.removal_effective_date) return "";
    const [year, month, day] = habit.removal_effective_date
      .split("-")
      .map(Number);
    const removalDate = new Date(Date.UTC(year, month - 1, day));
    removalDate.setUTCDate(removalDate.getUTCDate() - 1);
    const deletionIso = removalDate.toISOString().slice(0, 10);
    return `Eliminado el ${getIsoDayNameShort(deletionIso)} ${formatCompactDate(deletionIso)}`;
  })();

  return (
    <tr className="bg-white/70 dark:bg-slate-800/60 rounded-xl">
      <td className="text-left px-2 sm:px-3 py-3 font-medium min-w-36 sm:min-w-48">
        <span className="wrap-break-word">{habit.name}</span>
      </td>

      {dates.map((date) => (
        <td key={date} className="py-2">
          <TableCell
            status={habit.week[date]}
            onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
            isFuture={isFutureIsoDate(date)}
          />
        </td>
      ))}

      <td className="px-2">
        <div className="text-sm">
          <p className="font-semibold">{habit.streak_current || 0}d</p>
          <p className="text-slate-500 dark:text-slate-300 text-xs">
            Mejor {habit.streak_best || 0}d
          </p>
        </div>
      </td>

      <td>
        {canShowActions ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-0">
            <button
              onClick={() => onEdit(habit)}
              disabled={!canManageHabits}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600"
              title={
                canManageHabits
                  ? "Editar"
                  : "Solo puedes editar o eliminar hábitos los domingos"
              }
            >
              Editar
            </button>

            <button
              onClick={() => onDelete(habit)}
              disabled={!canManageHabits}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-600"
              title={
                canManageHabits
                  ? "Eliminar"
                  : "Solo puedes editar o eliminar hábitos los domingos"
              }
            >
              Eliminar
            </button>
          </div>
        ) : (
          <div className="flex justify-center px-2">
            <p className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 px-2.5 py-1 text-xs font-medium text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
              {removalMessage || "Eliminado"}
            </p>
          </div>
        )}
      </td>
    </tr>
  );
}
