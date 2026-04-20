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

export const getCompletionLevel = (value) => {
  if (value === null || value === undefined) {
    return "sin datos";
  }

  if (value >= 80) {
    return "alto";
  }

  if (value >= 50) {
    return "medio";
  }

  return "bajo";
};

export const getCompletionLevelHint = (value) => {
  const level = getCompletionLevel(value);

  if (level === "alto") {
    return "Excelente ritmo";
  }

  if (level === "medio") {
    return "Buen avance";
  }

  if (level === "bajo") {
    return "Con margen de mejora";
  }

  return "Aún sin señales";
};
