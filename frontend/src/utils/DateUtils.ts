export const TIMEZONE = "Europe/Berlin";
export const LOCALE = "de-DE";

// TODO this doesn't work for some dates that specify an explicit timezone but I couldn't figure out why.
// We should probably switch to something like date-fns
export const dateToLocaleDate = (date: string | Date): Date => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000);
};

export const dateToLocaleYYYYMMDDString = (date: string | Date): string => {
  return dateToLocaleDate(date).toISOString().split("T")[0];
};

export const dateToLocaleString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleString(LOCALE, { timeZone: TIMEZONE });
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
export const dateToRelativeString = (date: string | Date): string => {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always", style: "narrow" });
  let duration = (new Date(date).getTime() - Date.now()) / 1000;
  for (const division of RELATIVE_TIME_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return "";
};

export const dateToLocaleTimeString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleTimeString(LOCALE, { timeZone: TIMEZONE });
};

export const dateToLocaleDateString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleDateString(LOCALE, { timeZone: TIMEZONE });
};

export const isValidDate = (d: unknown) => {
  return d instanceof Date;
};

export const isValidDateString = (dateString: string): boolean => {
  return isValidDate(new Date(dateString));
};
