/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterOperator } from "./FilterOperator";
import type { FilterValueType } from "./FilterValueType";
import type { WordFrequencyColumns } from "./WordFrequencyColumns";

export type ColumnInfo_WordFrequencyColumns_ = {
  label: string;
  column: WordFrequencyColumns | number;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};
