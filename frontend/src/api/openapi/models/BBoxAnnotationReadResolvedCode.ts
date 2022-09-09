/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CodeRead } from "./CodeRead";

export type BBoxAnnotationReadResolvedCode = {
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
  code: CodeRead;
  /**
   * AnnotationDocument the BBoxAnnotation refers to
   */
  annotation_document_id: number;
  /**
   * Created timestamp of the BBoxAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the BBoxAnnotation
   */
  updated: string;
};
