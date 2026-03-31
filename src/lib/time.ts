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
    // Use Date.UTC to ensure consistent UTC-based date handling across all timezones
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
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

/**
 * Get the Monday (start of week) for a given day.
 * Used when switching from grid (day) to calendar (week) view.
 */
export const getWeekStartFromDay = (day: string | Date): string => {
  return toDateKey(startOfWeek(day));
};

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
  return toDateKey(day1) === toDateKey(day2);
};

/**
 * Check if a date is today
 */
export const isToday = (day: string | Date): boolean => {
  return isSameDay(day, new Date());
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
