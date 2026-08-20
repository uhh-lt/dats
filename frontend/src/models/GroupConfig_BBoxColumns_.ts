/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxColumns } from "./BBoxColumns";
import type { DateGranularity } from "./DateGranularity";
export type GroupConfig_BBoxColumns_ = {
  /**
   * The column to group results by
   */
  field: BBoxColumns;
  /**
   * Bucket size for grouping a date column (day/week/month/year). Only meaningful when `field` is a date column; ignored otherwise.
   */
  date_granularity?: DateGranularity | null;
};
