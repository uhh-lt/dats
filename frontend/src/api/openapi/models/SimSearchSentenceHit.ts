/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SpanAnnotationRead } from "./SpanAnnotationRead";

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
   * The sentence returned by the similarity search.
   */
  sentence_text: string;
  /**
   * The sentence SpanAnnotation holding the retrieved sentence
   */
  sentence_span: SpanAnnotationRead;
};
