export const formatClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export const formatHoursMinutes = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return "0m";
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const differenceInSeconds = (
  startTime: string,
  endTime: string,
): number => {
  const delta = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(0, Math.floor(delta / 1000));
};

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const toLocalDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return value;
  }

  const dateOnlyMatch = dateOnlyPattern.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
};

export const toDateKey = (value: string | Date): string => {
  const date = toLocalDate(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const startOfWeek = (value: string | Date): Date => {
  const date = toLocalDate(value);
  const normalized = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const day = normalized.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + delta);
  return normalized;
};

export const addDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

export const weekDays = (anchor: string | Date): Date[] => {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const shiftWeek = (anchor: string | Date, amount: number): string => {
  return toDateKey(addDays(startOfWeek(anchor), amount * 7));
};

export const shiftDay = (anchor: string | Date, amount: number): string => {
  const date = toLocalDate(anchor);
  const shifted = addDays(date, amount);
  return toDateKey(shifted);
};

export const todayKey = (): string => toDateKey(new Date());

const weekRangeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

export const formatWeekRange = (anchor: string): string => {
  const days = weekDays(anchor);
  const monday = days[0];
  const sunday = days[6];
  return `${weekRangeFormatter.format(monday)} \u2013 ${weekRangeFormatter.format(sunday)}`;
};

/**
 * Format a single day for display (e.g., "31 mars")
 */
export const formatDayDisplay = (day: string | Date): string => {
  const date = toLocalDate(day);
  return dayFormatter.format(date);
};

/**
 * Check if two dates represent the same day
 */
export const isSameDay = (day1: string | Date, day2: string | Date): boolean => {
  if (typeof day1 === 'string' && typeof day2 === 'string' && dateOnlyPattern.test(day1) && dateOnlyPattern.test(day2)) {
    return day1 === day2;
  }
  return toDateKey(day1) === toDateKey(day2);
};

export const toDateTimeLocalInputValue = (value: string): string => {
  const date = new Date(value);
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
};

export const fromDateTimeLocalInputValue = (value: string): string =>
  new Date(value).toISOString();

const padDatePart = (value: number): string => value.toString().padStart(2, "0");

export const toDateInputValue = (value: string): string => {
  const date = new Date(value);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

export const toTimeParts = (
  value: string,
): {
  hour: number;
  minute: number;
} => {
  const date = new Date(value);
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
};

export const toIsoFromDateAndTimeParts = (
  dateValue: string,
  hour: number,
  minute: number,
): string => {
  const match = dateOnlyPattern.exec(dateValue);

  if (!match) {
    throw new Error(`Invalid date value: ${dateValue}`);
  }

  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    minute,
    0,
    0,
  ).toISOString();
};

export const formatHourMinute = (hour: number, minute: number): string =>
  `${padDatePart(hour)}:${padDatePart(minute)}`;

export const getClockDialValueFromPoint = (
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
  divisions: number,
): number => {
  const angle = Math.atan2(pointY - centerY, pointX - centerX);
  const normalizedAngle =
    (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  const rawValue = (normalizedAngle / (Math.PI * 2)) * divisions;

  return Math.round(rawValue) % divisions;
};
