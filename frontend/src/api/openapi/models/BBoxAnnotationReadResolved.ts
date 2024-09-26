/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
export type BBoxAnnotationReadResolved = {
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
   * User the SpanAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc_id: number;
  /**
   * Created timestamp of the BBoxAnnotation
   */
  created: string;
  /**
   * Updated timestamp of the BBoxAnnotation
   */
  updated: string;
};
