/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { SdocColumns } from "./SdocColumns";
export type ColumnInfo_SdocColumns_ = {
  label: string;
  column: SdocColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
