/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ElasticSearchDocumentHit = {
  /**
   * The ID of the Document
   */
  id: number;
  /**
   * The score of the Document that was found by a ES Query
   */
  score?: number | null;
  /**
   * The highlights found within the document.
   */
  highlights?: Array<string>;
};
