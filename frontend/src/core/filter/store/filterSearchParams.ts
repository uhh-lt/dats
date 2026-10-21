import type { MRT_SortingState } from "material-react-table";
import { z } from "zod";
import { MyFilter } from "../filterUtils";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "./filterURLStore";

// Schemas of the search params that the routes' validateSearch schemas share.

/** A boolean search param; the URL may hold it as "true" / "false". */
export const booleanSearchParam = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(defaultValue);

/** The filter and the filter expert mode of a filter table; spread it into the route's z.object. */
export const filterSearchParams = <T extends string>() => ({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<T>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<T>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: booleanSearchParam(false),
});

/** The sorting state of a table. */
export const sortingModelSearchParam = (defaultValue: MRT_SortingState = []) =>
  z.array(z.object({ id: z.string(), desc: z.boolean() })).default(defaultValue);
