/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SimSearchSentenceHit = {
  /**
   * The ID of the SourceDocument the sentence appears in.
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
