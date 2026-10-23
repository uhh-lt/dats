import { searchParamBooleanValidator } from "@utils/searchParamValidators";
import { z } from "zod";
import { MyFilter } from "./filterUtils";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "./store/filterURLStore";

/** Validators of the filter and the filter expert mode of a filter table; spread them into the route's z.object. */
export const searchParamFilterValidators = <T extends string>() => ({
  [FILTER_PARAM]: z
    .custom<string | MyFilter<T>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<T>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: searchParamBooleanValidator({ default: false }),
});
