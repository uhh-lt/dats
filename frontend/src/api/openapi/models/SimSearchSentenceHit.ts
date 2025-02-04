/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SimSearchSentenceHit = {
  /**
   * The ID of the SourceDocument similar to the query.
   */
  sdoc_id: number;
  /**
   * The similarity score.
   */
  score: number;
  /**
   * The sentence id with respect to the SourceDocument
   */
  sentence_id: number;
};
