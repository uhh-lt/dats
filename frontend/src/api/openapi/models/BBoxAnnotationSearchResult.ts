/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationRow } from "./BBoxAnnotationRow";
export type BBoxAnnotationSearchResult = {
  /**
   * The total number of bbox_annotation_ids. Used for pagination.
   */
  total_results: number;
  /**
   * The Annotations.
   */
  data: Array<BBoxAnnotationRow>;
};
