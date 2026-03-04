/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SentenceAnnotationRow } from "./SentenceAnnotationRow";
export type SentenceAnnotationSearchResult = {
  /**
   * The total number of sentence_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The Annotations.
   */
  data: Array<SentenceAnnotationRow>;
};
