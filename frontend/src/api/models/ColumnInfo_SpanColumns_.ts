/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { SpanColumns } from "./SpanColumns";
export type ColumnInfo_SpanColumns_ = {
  label: string;
  column: SpanColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
