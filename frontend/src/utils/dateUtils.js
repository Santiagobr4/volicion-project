export const toLocalIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseIsoDateLocal = (isoDate) => {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getTodayIsoDate = (referenceDate = new Date()) =>
  toLocalIsoDate(referenceDate);

export const getCurrentWeekStartIsoDate = (referenceDate = new Date()) => {
  const weekDate = new Date(referenceDate);
  const day = weekDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekDate.setDate(weekDate.getDate() + diffToMonday);
  return toLocalIsoDate(weekDate);
};

export const getWeekDates = (weekStartIsoDate) => {
  const startDate = parseIsoDateLocal(weekStartIsoDate);
  if (!startDate) return [];

  return Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + index);
    return toLocalIsoDate(nextDate);
  });
};

export const isFutureIsoDate = (
  isoDate,
  referenceIsoDate = getTodayIsoDate(),
) => {
  const selectedDate = parseIsoDateLocal(isoDate);
  const referenceDate = parseIsoDateLocal(referenceIsoDate);

  if (!selectedDate || !referenceDate) return false;
  return selectedDate > referenceDate;
};

export const getEvaluatedDaysInWeek = (
  weekStartIsoDate,
  referenceIsoDate = getTodayIsoDate(),
) => {
  const weekDates = getWeekDates(weekStartIsoDate);
  if (weekDates.length === 0) return 0;

  return weekDates.filter((date) => !isFutureIsoDate(date, referenceIsoDate))
    .length;
};
