/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_MemoColumns__Input } from "./Filter_MemoColumns__Input";
import type { GroupConfig_MemoColumns_ } from "./GroupConfig_MemoColumns_";
import type { Sort_MemoColumns_ } from "./Sort_MemoColumns_";
export type QueryRequest_MemoColumns_ = {
  /**
   * Project the search runs in
   */
  project_id: number;
  /**
   * Full-text query
   */
  search_query?: string;
  /**
   * Column filter tree
   */
  filter: Filter_MemoColumns__Input;
  /**
   * Ordered sort expressions; empty means the entity's default sort
   */
  sorts?: Array<Sort_MemoColumns_>;
  /**
   * Grouping definition; together with `group_key`, restricts results to one group (drill-down). Both must be set or both omitted.
   */
  group_by?: GroupConfig_MemoColumns_ | null;
  /**
   * Key of the single group to drill into (requires `group_by`). Both must be set or both omitted.
   */
  group_key?: string | null;
  /**
   * Zero-based page index
   */
  page_number?: number;
  /**
   * Number of rows per page
   */
  page_size?: number;
};
