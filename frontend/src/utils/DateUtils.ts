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

export const dateToLocaleTimeString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleTimeString(LOCALE, { timeZone: TIMEZONE });
};

export const dateToLocaleDateString = (date: string | Date): string => {
  return dateToLocaleDate(date).toLocaleDateString(LOCALE, { timeZone: TIMEZONE });
};

export const isValidDate = (d: any) => {
  return !isNaN(d) && d instanceof Date;
};

export const isValidDateString = (dateString: string): boolean => {
  return isValidDate(new Date(dateString));
};
