/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ElasticSearchDocumentHit } from "./ElasticSearchDocumentHit";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type PaginatedSDocHits = {
  /**
   * The IDs, scores and (optional) highlights of Document search results on the requested page.
   */
  hits: Array<ElasticSearchDocumentHit>;
  /**
   * A dictionary with the additional information about the documents. The key is the document ID and the value is a dictionary with the additional information.
   */
  sdocs: Record<string, SourceDocumentRead>;
  /**
   * A dictionary with the additional information about the documents. The key is the document ID and the value is a dictionary with the additional information.
   */
  annotators: Record<string, Array<number>>;
  /**
   * A dictionary with the additional information about the documents. The key is the document ID and the value is a dictionary with the additional information.
   */
  tags: Record<string, Array<number>>;
  /**
   * The total number of hits. Used for pagination.
   */
  total_results: number;
};
