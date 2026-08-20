/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateGranularity } from "./DateGranularity";
import type { MemoColumns } from "./MemoColumns";
export type GroupConfig_MemoColumns_ = {
  /**
   * The column to group results by
   */
  field: MemoColumns;
  /**
   * Bucket size for grouping a date column (day/week/month/year). Only meaningful when `field` is a date column; ignored otherwise.
   */
  date_granularity?: DateGranularity | null;
};
