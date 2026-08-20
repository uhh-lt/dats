/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SentAnnoColumns__Input } from "./Filter_SentAnnoColumns__Input";
import type { GroupConfig_SentAnnoColumns_ } from "./GroupConfig_SentAnnoColumns_";
import type { Sort_SentAnnoColumns_ } from "./Sort_SentAnnoColumns_";
export type QueryRequest_SentAnnoColumns_ = {
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
  filter: Filter_SentAnnoColumns__Input;
  /**
   * Ordered sort expressions; empty means the entity's default sort
   */
  sorts?: Array<Sort_SentAnnoColumns_>;
  /**
   * Grouping definition; together with `group_key`, restricts results to one group (drill-down). Both must be set or both omitted.
   */
  group_by?: GroupConfig_SentAnnoColumns_ | null;
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
