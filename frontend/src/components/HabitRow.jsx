import TableCell from "./TableCell";
import { formatCompactDate, getIsoDayNameShort } from "../utils/dateLabels";
import { isFutureIsoDate } from "../utils/dateUtils";
import { buttonClassName } from "./ui.js";

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
    const [year, month, day] = habit.removal_effective_date.split("-").map(Number);
    const removalDate = new Date(Date.UTC(year, month - 1, day));
    removalDate.setUTCDate(removalDate.getUTCDate() - 1);
    const deletionIso = removalDate.toISOString().slice(0, 10);
    return `Eliminado el ${getIsoDayNameShort(deletionIso)} ${formatCompactDate(deletionIso)}`;
  })();

  const cellBg = "bg-paper-2";

  return (
    <tr>
      <td className={`text-left px-3 py-3 min-w-52 rounded-l-[10px] ${cellBg}`}>
        <span className="break-words font-medium">{habit.name}</span>
      </td>

      {dates.map((date) => (
        <td key={date} className={`py-2 ${cellBg}`}>
          <TableCell
            status={habit.week[date]}
            onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
            isFuture={isFutureIsoDate(date)}
          />
        </td>
      ))}

      <td className={`px-2 ${cellBg}`}>
        <div className="text-center leading-none">
          <p className="font-serif text-[20px]">{habit.streak_current || 0}</p>
          <p className="font-mono text-[10px] text-ink-4 mt-0.5">/{habit.streak_best || 0} mejor</p>
        </div>
      </td>

      <td className={`rounded-r-[10px] ${cellBg}`}>
        {canShowActions ? (
          <div className="flex items-center justify-center gap-1.5 px-2">
            <button
              onClick={() => onEdit(habit)}
              disabled={!canManageHabits}
              className={buttonClassName({ variant: "ghost", size: "sm" })}
              title={canManageHabits ? "Editar" : "Solo puedes editar o eliminar hábitos los domingos"}
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(habit)}
              disabled={!canManageHabits}
              className={buttonClassName({ variant: "danger", size: "sm" })}
              title={canManageHabits ? "Eliminar" : "Solo puedes editar o eliminar hábitos los domingos"}
            >
              Eliminar
            </button>
          </div>
        ) : (
          <div className="flex justify-center px-2">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/8 text-ink-3 px-3 py-1 font-mono text-[10px]">
              {removalMessage || "Eliminado"}
            </p>
          </div>
        )}
      </td>
    </tr>
  );
}
