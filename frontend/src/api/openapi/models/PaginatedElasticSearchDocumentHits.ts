/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ElasticSearchDocumentHit } from "./ElasticSearchDocumentHit";

export type PaginatedElasticSearchDocumentHits = {
  /**
   * Flag that indicates whether there are more search results.
   */
  has_more: boolean;
  /**
   * The total number of results.
   */
  total: number;
  /**
   * The offset that returns the current results.
   */
  current_page_offset: number;
  /**
   * The offset that returns the next results.
   */
  next_page_offset: number;
  /**
   * The IDs of SourceDocument search results on the requested page.
   */
  hits: Array<ElasticSearchDocumentHit>;
};
