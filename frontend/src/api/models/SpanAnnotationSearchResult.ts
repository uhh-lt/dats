/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRow } from "./SpanAnnotationRow";
export type SpanAnnotationSearchResult = {
  /**
   * The total number of span_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The Annotations.
   */
  data: Array<SpanAnnotationRow>;
};
