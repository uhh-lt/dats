/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { TimelineAnalysisColumns } from "./TimelineAnalysisColumns";
export type ColumnInfo_TimelineAnalysisColumns_ = {
  label: string;
  column: TimelineAnalysisColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
