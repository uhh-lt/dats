/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_MemoColumns__Output } from "./Filter_MemoColumns__Output";
import type { GroupConfig_MemoColumns_ } from "./GroupConfig_MemoColumns_";
import type { MemoColumns } from "./MemoColumns";
import type { SearchViewLayout } from "./SearchViewLayout";
import type { Sort_MemoColumns_ } from "./Sort_MemoColumns_";
export type MemoSearchViewRead = {
  entity_type?: string;
  project_id: number;
  name: string;
  layout: SearchViewLayout;
  /**
   * Column filter tree applied before grouping
   */
  filters: Filter_MemoColumns__Output;
  group_by?: GroupConfig_MemoColumns_ | null;
  sorts?: Array<Sort_MemoColumns_>;
  selected_properties?: Array<MemoColumns> | null;
  id: number;
  user_id: number;
  position: number;
  created: string;
  updated: string;
};
