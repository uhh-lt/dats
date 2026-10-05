// Date/time handling for the frontend.
//
// Two distinct kinds of "date" flow through the app, and they must be handled
// differently:
//
// 1. INSTANTS — real timestamps (timestamptz from the backend, e.g. `created`,
//    `updated`, COTA `date`). These are a specific moment in time. They must be
//    displayed in the VIEWER'S local timezone, so we simply let the browser
//    localize them (no hardcoded `timeZone` option). A user in Germany and a
//    user in the US each see the moment in their own local time.
//
// 2. CALENDAR DATES — a day with no time component, edited via
//    `<input type="date">` which produces/consumes a `YYYY-MM-DD` string. These
//    must be interpreted as a calendar day, NOT as an instant. Parsing a
//    `YYYY-MM-DD` string with `new Date(...)` assumes UTC midnight and shifts
//    the day for viewers behind UTC, so we parse/format them field-by-field.

// ---------------------------------------------------------------------------
// Instants
// ---------------------------------------------------------------------------

/** Parse an instant (RFC 3339 string with offset, or a Date) into a Date. */
export const parseDate = (date: string | Date): Date => new Date(date);

/** Full date+time in the viewer's local timezone and locale. */
export const formatDateTime = (date: string | Date): string => {
  return parseDate(date).toLocaleString();
};

/** Time-only in the viewer's local timezone and locale. */
export const formatTime = (date: string | Date): string => {
  return parseDate(date).toLocaleTimeString();
};

/** Date-only (no time) in the viewer's local timezone and locale. */
export const formatDate = (date: string | Date): string => {
  return parseDate(date).toLocaleDateString();
};

const RELATIVE_TIME_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** Compact relative time like "1d ago" / "in 3w" (narrow units), for secondary metadata such as "Edited 1d ago". */
export const formatRelativeTime = (date: string | Date): string => {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "always", style: "narrow" });
  let duration = (parseDate(date).getTime() - Date.now()) / 1000;
  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return "";
};

// ---------------------------------------------------------------------------
// Calendar dates (YYYY-MM-DD, timezone-independent)
// ---------------------------------------------------------------------------

/**
 * Format an instant as the viewer's LOCAL calendar date in `YYYY-MM-DD` form.
 * Used to pre-fill `<input type="date">`. Unlike `toISOString().split("T")[0]`
 * (which is always UTC), this respects the viewer's local day.
 */
export const toLocalYYYYMMDD = (date: string | Date): string => {
  const d = parseDate(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Parse a `YYYY-MM-DD` string (from `<input type="date">`) as LOCAL midnight,
 * not UTC midnight. Returns undefined for empty/invalid input.
 */
export const parseLocalYYYYMMDD = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(y, m - 1, day);
  return isValidDate(d) ? d : undefined;
};

/**
 * Format a calendar date (`YYYY-MM-DD` string from the backend) in the
 * viewer's locale, WITHOUT any timezone shift. Use this for date-only values
 * (e.g. metadata `date_value`, COTA `date`) — never `formatDate`, which would
 * parse the string as UTC midnight and shift the day for viewers behind UTC.
 */
export const formatDateOnly = (date: string): string => {
  const d = parseLocalYYYYMMDD(date);
  return d ? d.toLocaleDateString() : date;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const isValidDate = (d: unknown): d is Date => {
  return d instanceof Date && !Number.isNaN(d.getTime());
};

export const isValidDateString = (dateString: string): boolean => {
  return isValidDate(new Date(dateString));
};
