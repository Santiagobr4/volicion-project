export const getSymbol = (status) => {
  if (status === "done") return "✔";
  if (status === "missed") return "✖";
  if (status === "skip") return "—";
  return "·";
};

export const getStatusStyle = (status) => {
  if (status === "done") return "bg-lime-ink border border-lime-ink text-paper";
  if (status === "missed") return "bg-signal-soft border border-signal/30 text-signal";
  if (status === "skip") return "bg-paper-3 border border-ink/15 text-ink-4";
  return "border border-ink/22 text-ink-4";
};

export const getPercentageStyle = (rate) => {
  if (rate >= 80) return "bg-green-500 text-white";
  if (rate >= 50) return "bg-yellow-400 text-black";
  return "bg-red-500 text-white";
};

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_SHORT = { monday: "L", tuesday: "M", wednesday: "X", thursday: "J", friday: "V", saturday: "S", sunday: "D" };

/**
 * Returns true when the habit is scheduled to be done on the given ISO date.
 * Falls back to true if the habit doesn't expose a schedule, so we don't
 * accidentally hide active days when data is missing.
 */
export const isHabitScheduledOnDate = (habit, isoDate) => {
  if (!isoDate) return true;
  const days = Array.isArray(habit?.editable_days) && habit.editable_days.length
    ? habit.editable_days
    : Array.isArray(habit?.days) ? habit.days : null;
  if (!days || !days.length) return true;
  // Date.getUTCDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const utcDay = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const weekdayName = utcDay === 0 ? "sunday" : WEEKDAY_ORDER[utcDay - 1];
  return days.includes(weekdayName);
};

export const getHabitMeta = (habit) => {
  const days = Array.isArray(habit?.editable_days) && habit.editable_days.length
    ? habit.editable_days
    : Array.isArray(habit?.days) ? habit.days : [];
  if (!days.length) return "Sin programación";
  const set = new Set(days);
  if (WEEKDAY_ORDER.every((d) => set.has(d))) return "Diario";
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const weekend = ["saturday", "sunday"];
  if (weekdays.every((d) => set.has(d)) && !weekend.some((d) => set.has(d))) return "Lun a Vie";
  if (weekend.every((d) => set.has(d)) && !weekdays.some((d) => set.has(d))) return "Fin de semana";
  return WEEKDAY_ORDER.filter((d) => set.has(d)).map((d) => WEEKDAY_SHORT[d]).join(" · ");
};
