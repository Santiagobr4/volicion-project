import api from "./index";

/**
 * Build a query string with URLSearchParams and skip empty values.
 */
const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
};

/**
 * Fetch tracker matrix for a specific week start date.
 */
export const getWeekly = async (date) => {
  const query = buildQueryString({ start_date: date, _ts: Date.now() });
  const res = await api.get(`/habits/weekly/${query}`);
  return res.data;
};

/**
 * Fetch historical metrics for a preset day window.
 */
export const getHistory = async ({ days = 90 } = {}) => {
  const query = buildQueryString({ days, _ts: Date.now() });
  const res = await api.get(`/habits/history/${query}`);
  return res.data;
};

/**
 * Fetch compact tracker insights for a week.
 */
export const getTrackerMetrics = async (startDate) => {
  const query = buildQueryString({ start_date: startDate, _ts: Date.now() });
  const res = await api.get(`/habits/tracker-metrics/${query}`);
  return res.data;
};

export const getLeaderboard = async () => {
  const query = buildQueryString({ _ts: Date.now() });
  const res = await api.get(`/habits/leaderboard/${query}`);
  return res.data;
};

export const updateLog = async (habitId, date, status) => {
  await api.post("/logs/", { habit: habitId, date, status });
};

export const createHabit = async (habit) => {
  await api.post("/habits/", habit);
};

export const updateHabit = async (id, data) => {
  await api.patch(`/habits/${id}/`, data);
};

export const deleteHabit = async (id) => {
  await api.delete(`/habits/${id}/`);
};
