const LONG_DAY_FORMATTER = new Intl.DateTimeFormat("es-419", {
  weekday: "long",
  timeZone: "UTC",
});

const SHORT_DAY_FORMATTER = new Intl.DateTimeFormat("es-419", {
  weekday: "short",
  timeZone: "UTC",
});

const READABLE_DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat("es-419", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const getIsoDateLabel = (isoDate) => {
  if (!isoDate) return "";
  return isoDate.slice(5);
};

export const getIsoDayNameLong = (isoDate) => {
  if (!isoDate) return "";
  const label = LONG_DAY_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const getIsoDayNameShort = (isoDate) => {
  if (!isoDate) return "";
  const label = SHORT_DAY_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const capitalizeDayCode = (value) => {
  if (!value) return "";
  const dayMap = {
    monday: "Lun",
    tuesday: "Mar",
    wednesday: "Mié",
    thursday: "Jue",
    friday: "Vie",
    saturday: "Sáb",
    sunday: "Dom",
  };
  return dayMap[value.toLowerCase()] || value;
};

export const formatReadableDate = (isoDate) => {
  if (!isoDate) return "";
  return READABLE_DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
};

export const formatCompactDate = (isoDate) => {
  if (!isoDate) return "";
  return COMPACT_DATE_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
};

export const formatReadableDateRange = (startDate, endDate) => {
  const startLabel = formatReadableDate(startDate);
  const endLabel = formatReadableDate(endDate);

  if (!startLabel || !endLabel) return "";

  return `${startLabel} a ${endLabel}`;
};
