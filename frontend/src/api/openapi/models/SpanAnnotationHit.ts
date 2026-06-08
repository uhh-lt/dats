/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationCreate } from "./SpanAnnotationCreate";
export type SpanAnnotationHit = {
  /**
   * The DTO needed to create the SpanAnnotation.
   */
  span_dto: SpanAnnotationCreate;
  /**
   * The context before the span.
   */
  before_context: string;
  /**
   * The context after the span.
   */
  after_context: string;
};
