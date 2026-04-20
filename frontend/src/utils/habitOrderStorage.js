const LEGACY_KEY = "weekly_active_habit_order";

export const getHabitOrderStorageKey = (userId) => {
  if (!userId) return LEGACY_KEY;
  return `weekly_active_habit_order:${userId}`;
};

export const loadHabitOrder = (userId) => {
  const namespacedKey = getHabitOrderStorageKey(userId);
  const namespacedValue = localStorage.getItem(namespacedKey);
  if (namespacedValue) {
    try {
      const parsed = JSON.parse(namespacedValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  const legacyValue = localStorage.getItem(LEGACY_KEY);
  if (!legacyValue) return [];

  try {
    const parsed = JSON.parse(legacyValue);
    if (!Array.isArray(parsed)) return [];
    localStorage.setItem(namespacedKey, JSON.stringify(parsed));
    return parsed;
  } catch {
    return [];
  }
};

export const saveHabitOrder = (userId, order) => {
  const key = getHabitOrderStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(order));
};

export const clearHabitOrder = (userId) => {
  localStorage.removeItem(LEGACY_KEY);
  if (userId) {
    localStorage.removeItem(getHabitOrderStorageKey(userId));
  }
};
