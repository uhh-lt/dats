/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationHit } from "./SpanAnnotationHit";
export type PaginatedSpanAnnotationHits = {
  /**
   * The total number of SpanAnnotation hits. Used for pagination.
   */
  total_results: number;
  /**
   * The SpanAnnotation hits matching the search query.
   */
  hits: Array<SpanAnnotationHit>;
};
