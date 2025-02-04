/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { SentAnnoColumns } from "./SentAnnoColumns";
export type ColumnInfo_SentAnnoColumns_ = {
  label: string;
  column: SentAnnoColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
