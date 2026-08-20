/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GroupSummary } from "./GroupSummary";
/**
 * A paginated list of groups.
 */
export type GroupPage = {
  /**
   * The groups on the requested page
   */
  items: Array<GroupSummary>;
  /**
   * Total number of groups (unpaginated), used for pagination
   */
  total_results: number;
};
