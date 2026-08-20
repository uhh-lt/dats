/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_BBoxColumns__Input } from "./Filter_BBoxColumns__Input";
import type { GroupConfig_BBoxColumns_ } from "./GroupConfig_BBoxColumns_";
export type GroupQueryRequest_BBoxColumns_ = {
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
  filter: Filter_BBoxColumns__Input;
  /**
   * The column (and optional date granularity) to group by
   */
  group_by: GroupConfig_BBoxColumns_;
  /**
   * Zero-based page index
   */
  page_number?: number;
  /**
   * Number of groups per page
   */
  page_size?: number;
};
