import TableCell from "./TableCell";

export default function HabitRow({
  habit,
  dates,
  onUpdate,
  onEdit,
  onDelete,
  canManageHabits = true,
}) {
  return (
    <tr className="bg-white/70 dark:bg-slate-800/60 rounded-xl">
      <td className="text-left px-2 sm:px-3 py-3 font-medium min-w-40 sm:min-w-52">
        <span className="break-words">{habit.name}</span>
      </td>

      {dates.map((date) => (
        <td key={date} className="py-2">
          <TableCell
            status={habit.week[date]}
            onClick={() => onUpdate(habit.habit_id, date, habit.week[date])}
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 sm:px-0">
          <button
            onClick={() => onEdit(habit)}
            disabled={!canManageHabits}
            className="w-full sm:w-auto px-2 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="w-full sm:w-auto px-2 sm:px-3 py-1.5 rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              canManageHabits
                ? "Eliminar"
                : "Solo puedes editar o eliminar hábitos los domingos"
            }
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}
