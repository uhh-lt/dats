import { notFound } from "@tanstack/react-router";

/**
 * Parses a numeric id path param (`$projectId`, `$sdocId`, ...) in a route's `params.parse`. A param that is not a
 * positive integer (`/project/abc`) throws `notFound()`, so the page shows the not-found component instead of loading
 * with `NaN`.
 */
export const parseIdParam = (value: string): number => {
  if (!/^\d+$/.test(value)) throw notFound();
  return Number(value);
};
