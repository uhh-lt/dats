export const TIMEZONE = "Europe/Berlin";
export const LOCALE = "de-DE";

const dateToLocaleDate = (date: string | Date): Date => {
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

export const dateToLocaleTimeString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleTimeString(LOCALE, { timeZone: TIMEZONE });
};

export const dateToLocaleDateString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleDateString(LOCALE, { timeZone: TIMEZONE });
};
