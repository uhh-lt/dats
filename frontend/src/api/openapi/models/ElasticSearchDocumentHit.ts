/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ElasticSearchDocumentHit = {
  /**
   * The ID of the SourceDocument as it is in the SQL DB
   */
  sdoc_id: number;
  /**
   * The score of the SourceDocument that was found by a ES Query
   */
  score?: number | null;
  /**
   * The highlights found within the document.
   */
  highlights?: Array<string>;
};
