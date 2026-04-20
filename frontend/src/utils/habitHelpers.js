export const getSymbol = (status) => {
  if (status === "done") return "✔";
  if (status === "missed") return "✖";
  if (status === "skip") return "-";
  return "⏳";
};

export const getStatusStyle = (status) => {
  if (status === "done") return "bg-green-500 text-white";
  if (status === "missed") return "bg-red-500 text-white";
  if (status === "skip")
    return "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-200";
  return "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300";
};

export const getPercentageStyle = (rate) => {
  if (rate >= 80) return "bg-green-500 text-white";
  if (rate >= 50) return "bg-yellow-400 text-black";
  return "bg-red-500 text-white";
};
