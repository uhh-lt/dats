/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Filter_SearchColumns_ } from "./Filter_SearchColumns_";
export type SimSearchQuery = {
  /**
   * The ID of the Project the SourceDocuments have to belong to.
   */
  proj_id: number;
  /**
   * The query term. This can be either a single string, a list of strings for which the average embedding gets computed, or an integer which is interpreted as the SDoc ID of an Image.
   */
  query: string | Array<string> | number;
  /**
   * The number of results to return.
   */
  top_k?: number;
  /**
   * The minimum distance to use for the sim search.
   */
  threshold?: number;
  /**
   * Only return documents matching this filter
   */
  filter: Filter_SearchColumns_;
};
