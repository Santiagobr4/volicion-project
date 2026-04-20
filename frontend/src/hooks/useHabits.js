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
import {
  getCurrentWeekStartIsoDate,
  getTodayIsoDate,
  isFutureIsoDate,
  parseIsoDateLocal,
  toLocalIsoDate,
} from "../utils/dateUtils";

const getWeekStart = (referenceDate = new Date()) =>
  getCurrentWeekStartIsoDate(referenceDate);

const getMaxFutureWeekStart = (referenceDate = new Date()) => {
  const futureWeekStart = new Date(referenceDate);
  futureWeekStart.setDate(futureWeekStart.getDate() + 7);
  return getCurrentWeekStartIsoDate(futureWeekStart);
};

const getWeekStartFromIsoDate = (isoDate) => {
  const date = parseIsoDateLocal(isoDate);
  if (!date) return null;

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
  const canGoNext = startDate < getMaxFutureWeekStart();

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

    if (dir > 0 && !canGoNext) {
      return;
    }

    if (dir < 0 && minimumWeekStart && startDate <= minimumWeekStart) {
      return;
    }

    d.setDate(d.getDate() + dir * 7);
    const nextStartDate = toLocalIsoDate(d);

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

  const isFutureDate = (value) => isFutureIsoDate(value);

  const isTodayDate = (value) => value === getTodayIsoDate();

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

      if (Array.isArray(habit?.days) && habit.days.length > 0) {
        const updatedDays = [...habit.days];
        setData((prev) =>
          prev.map((item) =>
            item.habit_id === id
              ? {
                  ...item,
                  editable_days: updatedDays,
                }
              : item,
          ),
        );
      }

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
