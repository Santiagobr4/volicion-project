import { useEffect, useState, useCallback, useRef } from "react";
import { getApiErrorMessage } from "../api/auth";
import {
  getWeekly,
  getTrackerMetrics,
  updateLog,
  createHabit,
  updateHabit,
  deleteHabit,
} from "../api/habits";

/**
 * Convert a Date into local YYYY-MM-DD format.
 */
const toLocalIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diffToMonday);
  return toLocalIsoDate(now);
};

/**
 * Normalize any ISO date to the Monday of that week.
 */
const getWeekStartFromIsoDate = (isoDate) => {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return toLocalIsoDate(date);
};

/**
 * Main tracker hook.
 *
 * Provides weekly matrix data, tracker metrics, and mutation handlers
 * while keeping UI components focused on rendering concerns.
 */
export const useHabits = ({ onDataChanged } = {}) => {
  const [data, setData] = useState([]);
  const [dates, setDates] = useState([]);
  const [trackerMetrics, setTrackerMetrics] = useState(null);
  const [startDate, setStartDate] = useState(getWeekStart());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const firstLoadRef = useRef(true);
  const minimumWeekStart = getWeekStartFromIsoDate(
    trackerMetrics?.baseline_date,
  );
  const canGoPrev = minimumWeekStart ? startDate > minimumWeekStart : true;
  const canGoNext = startDate < getWeekStart();

  const fetchData = useCallback(async () => {
    try {
      if (firstLoadRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const [res, metrics] = await Promise.all([
        getWeekly(startDate),
        getTrackerMetrics(startDate),
      ]);

      setData(res.habits || []);
      setTrackerMetrics(metrics);

      if (res.habits?.length > 0) {
        setDates(Object.keys(res.habits[0].week));
      } else {
        setDates([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("No pudimos cargar tus datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoadRef.current = false;
    }
  }, [startDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changeWeek = (dir) => {
    const d = new Date(`${startDate}T00:00:00`);
    const currentWeekStart = getWeekStart();

    if (dir > 0 && startDate >= currentWeekStart) {
      return;
    }

    if (dir < 0 && minimumWeekStart && startDate <= minimumWeekStart) {
      return;
    }

    d.setDate(d.getDate() + dir * 7);
    const nextStartDate = toLocalIsoDate(d);

    if (nextStartDate > currentWeekStart) {
      setStartDate(currentWeekStart);
      return;
    }

    if (minimumWeekStart && nextStartDate < minimumWeekStart) {
      setStartDate(minimumWeekStart);
      return;
    }

    setStartDate(nextStartDate);
  };

  const goToCurrentWeek = () => {
    setStartDate(getWeekStart());
  };

  const toggleStatus = (current) => {
    if (current === "pending") return "done";
    if (current === "done") return "missed";
    return "pending";
  };

  const isFutureDate = (value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(`${value}T00:00:00`);
    return selected > today;
  };

  const isTodayDate = (value) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(`${value}T00:00:00`);
    return selected.getTime() === today.getTime();
  };

  const handleUpdate = async (habitId, date, currentStatus) => {
    if (currentStatus === "skip") {
      return { success: true };
    }

    try {
      const newStatus = toggleStatus(currentStatus);

      if (!isTodayDate(date)) {
        return {
          success: false,
          type: "error",
          message: "Solo puedes actualizar registros del día de hoy.",
        };
      }

      if (newStatus === "done" && isFutureDate(date)) {
        return {
          success: false,
          type: "error",
          message:
            "No puedes marcar un hábito como completado antes de ese día.",
        };
      }

      await updateLog(habitId, date, newStatus);
      await fetchData();
      onDataChanged?.();

      return { success: true };
    } catch (err) {
      console.error("Update error:", err);
      return {
        success: false,
        type: "error",
        message: getApiErrorMessage(err, "No pudimos actualizar el estado."),
      };
    }
  };

  const handleCreate = async (habit) => {
    try {
      await createHabit(habit);
      await fetchData();
      onDataChanged?.();
      return { success: true };
    } catch (err) {
      console.error("Create error:", err);
      return {
        success: false,
        message: getApiErrorMessage(err, "No pudimos crear el hábito"),
      };
    }
  };

  const handleEdit = async (id, habit) => {
    try {
      await updateHabit(id, habit);
      await fetchData();
      onDataChanged?.();
      return { success: true };
    } catch (err) {
      console.error("Edit error:", err);
      return {
        success: false,
        message: getApiErrorMessage(err, "No pudimos actualizar el hábito"),
      };
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHabit(id);
      await fetchData();
      onDataChanged?.();
      return { success: true };
    } catch (err) {
      console.error("Delete error:", err);
      return {
        success: false,
        message: getApiErrorMessage(err, "No pudimos eliminar el hábito"),
      };
    }
  };

  return {
    data,
    dates,
    trackerMetrics,
    startDate,
    loading,
    refreshing,
    error,
    canGoPrev,
    canGoNext,

    changeWeek,
    goToCurrentWeek,

    handleUpdate,
    handleCreate,
    handleEdit,
    handleDelete,
  };
};
