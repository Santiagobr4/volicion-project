import TableCell from "./TableCell";
import {
  formatCompactDate,
  getIsoDateLabel,
  getIsoDayNameShort,
} from "../utils/dateLabels";
import { isFutureIsoDate } from "../utils/dateUtils";
import { buttonClassName } from "./ui.js";

export default function HabitCardMobile({
  habit,
  dates,
  canManageHabits,
  onUpdate,
  onEdit,
  onDelete,
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

  return (
    <article className="rounded-[14px] border border-ink/10 bg-paper-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium text-sm leading-5 whitespace-normal break-normal">{habit.name}</h4>
        <div className="shrink-0 text-right leading-none">
          <p className="font-serif text-[20px]">{habit.streak_current || 0}</p>
          <p className="font-mono text-[10px] text-ink-4 mt-0.5">/{habit.streak_best || 0} mejor</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {dates.map((date) => (
          <div key={date} className="min-w-0 text-center">
            <p className="font-mono text-[10px] uppercase text-ink-4 truncate">
              {getIsoDayNameShort(date)}
            </p>
            <p className="font-mono text-[10px] text-ink-4 truncate mb-1">
              {getIsoDateLabel(date)}
            </p>
            <TableCell
              status={habit.week[date]}
              onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
              isFuture={isFutureIsoDate(date)}
            />
          </div>
        ))}
      </div>

      {canShowActions ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onEdit(habit)}
            disabled={!canManageHabits}
            className={buttonClassName({ variant: "ghost", size: "sm", fullWidth: true })}
            title={canManageHabits ? "Editar" : "Solo puedes editar o eliminar hábitos los domingos"}
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(habit)}
            disabled={!canManageHabits}
            className={buttonClassName({ variant: "danger", size: "sm", fullWidth: true })}
            title={canManageHabits ? "Eliminar" : "Solo puedes editar o eliminar hábitos los domingos"}
          >
            Eliminar
          </button>
        </div>
      ) : (
        <div className="mt-3 flex justify-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/8 text-ink-3 px-3 py-1 font-mono text-[10px]">
            {removalMessage || "Eliminado"}
          </p>
        </div>
      )}
    </article>
  );
}
