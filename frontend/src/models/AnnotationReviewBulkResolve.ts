/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationReviewAction } from "./AnnotationReviewAction";
export type AnnotationReviewBulkResolve = {
  action: AnnotationReviewAction;
  replacement_code_id?: number | null;
  /**
   * Code snapshot used by affected annotations
   */
  source_code_id: number;
};
