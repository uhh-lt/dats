/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptExampleSpan } from "./PromptExampleSpan";
/**
 * The sentences around selected span annotations with all spans of their annotator.
 */
export type SpanPromptExample = {
  /**
   * ID of the source document the text comes from
   */
  sdoc_id: number;
  /**
   * IDs of the annotations the example was created from
   */
  source_annotation_ids: Array<number>;
  /**
   * The text of the example
   */
  text: string;
  /**
   * The kind of annotation the example shows
   */
  kind: string;
  /**
   * All spans the annotator annotated in the text, sorted by begin
   */
  spans: Array<PromptExampleSpan>;
};
