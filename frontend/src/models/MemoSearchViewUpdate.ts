/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_MemoColumns__Input } from "./Filter_MemoColumns__Input";
import type { GroupConfig_MemoColumns_ } from "./GroupConfig_MemoColumns_";
import type { MemoColumns } from "./MemoColumns";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_MemoColumns_ } from "./Sort_MemoColumns_";
export type MemoSearchViewUpdate = {
  name?: string | null;
  layout?: SearchViewLayout | null;
  filters?: Filter_MemoColumns__Input | null;
  group_by?: GroupConfig_MemoColumns_ | null;
  sorts?: Array<Sort_MemoColumns_> | null;
  selected_properties?: Array<MemoColumns> | null;
};
