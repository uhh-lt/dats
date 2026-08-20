/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SpanColumns__Input } from "./Filter_SpanColumns__Input";
import type { GroupConfig_SpanColumns_ } from "./GroupConfig_SpanColumns_";
export type GroupQueryRequest_SpanColumns_ = {
  /**
   * Project the search runs in
   */
  project_id: number;
  /**
   * Full-text query applied before grouping
   */
  search_query?: string;
  /**
   * Column filter tree applied before grouping
   */
  filter: Filter_SpanColumns__Input;
  /**
   * The column (and optional date granularity) to group by
   */
  group_by: GroupConfig_SpanColumns_;
  /**
   * Zero-based page index
   */
  page_number?: number;
  /**
   * Number of groups per page
   */
  page_size?: number;
};
