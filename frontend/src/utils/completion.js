export const formatPercent = (value) =>
  value === null || value === undefined ? "N/D" : `${value}%`;

export const getCompletionColor = (value) => {
  if (value === null || value === undefined) {
    return "#94a3b8";
  }

  if (value >= 80) {
    return "#16a34a";
  }

  if (value >= 50) {
    return "#eab308";
  }

  return "#dc2626";
};

export const getCompletionTailwindClass = (value) => {
  if (value === null || value === undefined) {
    return "text-slate-500";
  }

  if (value >= 80) {
    return "text-green-600 dark:text-green-400";
  }

  if (value >= 50) {
    return "text-yellow-600 dark:text-yellow-400";
  }

  return "text-red-600 dark:text-red-400";
};
