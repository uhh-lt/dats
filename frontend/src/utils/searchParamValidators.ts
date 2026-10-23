import type { MRT_SortingState } from "material-react-table";
import { z } from "zod";

// Validators (zod schemas) of search params that the routes' validateSearch schemas share.

/** A boolean search param; the URL may hold it as "true" / "false". */
export const searchParamBooleanValidator = ({ default: defaultValue }: { default: boolean }) =>
  z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(defaultValue);

/** The sorting state of a table (default: no sorting). */
export const searchParamSortingModelValidator = ({ default: defaultValue = [] }: { default?: MRT_SortingState } = {}) =>
  z.array(z.object({ id: z.string(), desc: z.boolean() })).default(defaultValue);
