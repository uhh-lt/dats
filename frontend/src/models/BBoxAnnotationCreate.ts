/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BBoxAnnotationCreate = {
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
   * Code the BBoxAnnotation refers to
   */
  code_id: number;
  /**
   * SourceDocument the BBoxAnnotation refers to
   */
  sdoc_id: number;
  /**
   * BBoxAnnotation this one is copied from (e.g. accepted in the annotation comparison); records the provenance
   */
  source_annotation_id?: number | null;
};
