/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { SpanColumns } from "./SpanColumns";
export type ColumnInfo_SpanColumns_ = {
  /**
   * Display label of the column
   */
  label: string;
  /**
   * The column: an enum member, or an int id referring to a project-metadata column
   */
  column: SpanColumns | number;
  /**
   * Whether the column can be sorted
   */
  sortable: boolean;
  /**
   * Whether the column can be grouped
   */
  groupable: boolean;
  /**
   * The operator family the column supports for filtering
   */
  operator: FilterOperator;
  /**
   * The value type used to pick an appropriate value selector
   */
  value: FilterValueType;
};
