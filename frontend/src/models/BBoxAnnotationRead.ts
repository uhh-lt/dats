/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BBoxAnnotationRead = {
  /**
   * Absolute x_min coordinate of the BBoxAnnotation
   */
  x_min: number;
  /**
   * Absolute x_max coordinate of the BBoxAnnotation
   */
  x_max: number;
  /**
   * Absolute y_min coordinate of the BBoxAnnotation
   */
  y_min: number;
  /**
   * Absolute y_max coordinate of the BBoxAnnotation
   */
  y_max: number;
  /**
   * ID of the BBoxAnnotation
   */
  id: number;
  /**
   * Code the BBoxAnnotation refers to
   */
  code_id: number;
  /**
   * User that created the BBoxAnnotation
   */
  user_id: number;
  /**
   * SourceDocument the BBoxAnnotation refers to
   */
  sdoc_id: number;
  /**
   * Project the BBoxAnnotation belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the BBoxAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the BBoxAnnotation
   */
  updated: string;
  /**
   * BBoxAnnotation this one was copied from (provenance)
   */
  source_annotation_id: number | null;
  /**
   * User of the BBoxAnnotation this one was copied from
   */
  source_user_id: number | null;
  /**
   * Code of the copied BBoxAnnotation at copy time
   */
  source_code_id: number | null;
  /**
   * Memo IDs attached to the BBoxAnnotation
   */
  memo_ids: Array<number>;
};
