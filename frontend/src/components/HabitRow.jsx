import TableCell from "./TableCell";
import { formatCompactDate, getIsoDayNameShort } from "../utils/dateLabels";
import { isFutureIsoDate, getTodayIsoDate } from "../utils/dateUtils";
import { getHabitMeta, isHabitScheduledOnDate } from "../utils/habitHelpers";

export default function HabitRow({
  habit,
  dates,
  onUpdate,
  onEdit,
  onDelete,
  canManageHabits = true,
  showActionsColumn = true,
}) {
  const canShowActions = !habit.removal_effective_date;
  const removalMessage = (() => {
    if (!habit.removal_effective_date) return "";
    const [year, month, day] = habit.removal_effective_date.split("-").map(Number);
    const removalDate = new Date(Date.UTC(year, month - 1, day));
    removalDate.setUTCDate(removalDate.getUTCDate() - 1);
    const deletionIso = removalDate.toISOString().slice(0, 10);
    return `Eliminado el ${getIsoDayNameShort(deletionIso)} ${formatCompactDate(deletionIso)}`;
  })();

  const todayIso = getTodayIsoDate();

  return (
    <tr className="border-b border-ink/8">
      <td className="text-left px-3 py-4 min-w-52 align-middle">
        <p className="font-serif text-[22px] leading-[1.1]">{habit.name}</p>
        <p className="font-mono text-[10px] tracking-[0.10em] uppercase text-ink-4 mt-1">
          {getHabitMeta(habit)}
        </p>
      </td>

      {dates.map((date) => (
        <td key={date} className="py-2 align-middle">
          <div className="flex justify-center">
            <TableCell
              status={habit.week[date]}
              onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
              isFuture={isFutureIsoDate(date)}
              isToday={date === todayIso}
              isScheduled={isHabitScheduledOnDate(habit, date)}
            />
          </div>
        </td>
      ))}

      <td className="px-2 align-middle">
        <div className="text-right leading-none pr-1">
          <p className="font-serif text-[28px]">
            {habit.streak_current || 0}<span className="font-serif text-[14px] text-ink-3">d</span>
          </p>
          <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-ink-4 mt-1">
            Mejor · {habit.streak_best || 0}d
          </p>
        </div>
      </td>

      {showActionsColumn && (
        <td className="align-middle">
          {canShowActions ? (
            canManageHabits ? (
              <div className="flex items-center justify-end gap-1.5 px-2 fade-up">
                <button
                  onClick={() => onEdit(habit)}
                  className="px-3.5 py-1.5 rounded-full border border-ink/22 text-ink-3 text-[13px] hover:border-ink hover:text-ink transition-colors cursor-pointer"
                  title="Editar"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(habit)}
                  className="px-3.5 py-1.5 rounded-full border border-signal/40 text-signal text-[13px] hover:bg-signal-soft transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  Eliminar
                </button>
              </div>
            ) : null
          ) : (
            <div className="flex justify-center px-2">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/8 text-ink-3 px-3 py-1 font-mono text-[10px]">
                {removalMessage || "Eliminado"}
              </p>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}
