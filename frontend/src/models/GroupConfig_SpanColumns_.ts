/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateGranularity } from "./DateGranularity";
import type { SpanColumns } from "./SpanColumns";
export type GroupConfig_SpanColumns_ = {
  /**
   * The column to group results by
   */
  field: SpanColumns;
  /**
   * Bucket size for grouping a date column (day/week/month/year). Only meaningful when `field` is a date column; ignored otherwise.
   */
  date_granularity?: DateGranularity | null;
};
