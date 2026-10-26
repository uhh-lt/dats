import { searchParamBooleanValidator } from "@utils/searchParamValidators";
import { z } from "zod";
import { createEmptyFilter, MyFilter } from "./filterUtils";

export const FILTER_PARAM = "searchFilter";
export const FILTER_EXPERT_MODE_PARAM = "filterExpertMode";

const isValidFilter = (value: unknown): value is MyFilter => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as MyFilter;
  return typeof candidate.id === "string" && Array.isArray(candidate.items) && Boolean(candidate.logic_operator);
};

const tryParseFilter = (value: string): MyFilter | undefined => {
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as unknown;
    return isValidFilter(parsed) ? parsed : undefined;
  } catch {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isValidFilter(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
};

/** The filter of the URL (an object, or its JSON string); an invalid or missing value becomes an empty filter. */
const deserializeFilterFromSearchParam = <T extends string = string>(
  value: unknown,
  filterName: string,
): MyFilter<T> => {
  const parsed = isValidFilter(value)
    ? value
    : typeof value === "string" && value.length > 0
      ? tryParseFilter(value)
      : undefined;

  if (!parsed) {
    return createEmptyFilter<T>(filterName);
  }

  if (!parsed.id) {
    return {
      ...parsed,
      id: filterName,
    } as MyFilter<T>;
  }

  return parsed as MyFilter<T>;
};

/** Validators of the filter and the filter expert mode of a filter table; spread them into the route's z.object. */
export const searchParamFilterValidators = <T extends string>() => ({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<T>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<T>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: searchParamBooleanValidator({ default: false }),
});
