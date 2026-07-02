/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ElasticSearchHit } from "./ElasticSearchHit";
export type PaginatedElasticSearchHits = {
  /**
   * The IDs, scores and (optional) highlights of Document search results on the requested page.
   */
  hits: Array<ElasticSearchHit>;
  /**
   * The total number of hits. Used for pagination.
   */
  total_results: number;
};
