export const getSymbol = (status) => {
  if (status === "done") return "✔";
  if (status === "missed") return "✖";
  if (status === "skip") return "-";
  return "⏳";
};

export const getStatusStyle = (status) => {
  if (status === "done") return "bg-green-500 text-white";
  if (status === "missed") return "bg-red-500 text-white";
  if (status === "skip") return "bg-gray-300 dark:bg-gray-700 text-gray-400";
  return "bg-gray-200 dark:bg-gray-800 text-gray-500";
};

export const getPercentageStyle = (rate) => {
  if (rate >= 80) return "bg-green-500 text-white";
  if (rate >= 50) return "bg-yellow-400 text-black";
  return "bg-red-500 text-white";
};
