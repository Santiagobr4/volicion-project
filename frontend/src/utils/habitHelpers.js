export const getSymbol = (status) => {
  if (status === "done") return "✔";
  if (status === "missed") return "✖";
  if (status === "skip") return "—";
  return "·";
};

export const getStatusStyle = (status) => {
  if (status === "done") return "bg-ink text-paper";
  if (status === "missed") return "bg-signal-soft border border-signal/30 text-signal";
  if (status === "skip") return "bg-paper-3 text-ink-4";
  return "bg-paper-2 border border-ink/15 text-ink-4";
};

export const getPercentageStyle = (rate) => {
  if (rate >= 80) return "bg-green-500 text-white";
  if (rate >= 50) return "bg-yellow-400 text-black";
  return "bg-red-500 text-white";
};
