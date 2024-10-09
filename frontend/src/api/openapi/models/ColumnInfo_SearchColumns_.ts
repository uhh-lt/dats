/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { SearchColumns } from "./SearchColumns";
export type ColumnInfo_SearchColumns_ = {
  label: string;
  column: SearchColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
