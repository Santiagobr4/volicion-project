import TableCell from "./TableCell";
import { getIsoDateLabel, getIsoDayNameShort } from "../utils/dateLabels";

export default function HabitCardMobile({
  habit,
  dates,
  canManageHabits,
  onUpdate,
  onEdit,
  onDelete,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-sm leading-5 break-words">
          {habit.name}
        </h4>
        <div className="shrink-0 text-right text-xs">
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            {habit.streak_current || 0}d
          </p>
          <p className="text-slate-500 dark:text-slate-300">
            Mejor {habit.streak_best || 0}d
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {dates.map((date) => (
          <div key={date} className="min-w-0 text-center">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-300 truncate">
              {getIsoDayNameShort(date)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mb-1">
              {getIsoDateLabel(date)}
            </p>
            <TableCell
              status={habit.week[date]}
              onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onEdit(habit)}
          disabled={!canManageHabits}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="px-3 py-2 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            canManageHabits
              ? "Eliminar"
              : "Solo puedes editar o eliminar hábitos los domingos"
          }
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}
