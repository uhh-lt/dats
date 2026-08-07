/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRead } from "./SpanAnnotationRead";
export type AnnotationResult = {
  /**
   * Status of the Result
   */
  status: AnnotationResult.status;
  /**
   * Status message of the result
   */
  status_message: string;
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * Suggested annotations
   */
  suggested_annotations: Array<SpanAnnotationRead>;
  /**
   * Raw LLM response (only set if no annotations were suggested or an error occurred)
   */
  raw_response?: string | null;
};
export namespace AnnotationResult {
  /**
   * Status of the Result
   */
  export enum status {
    ERROR = "error",
    FINISHED = "finished",
    PARTIAL = "partial",
  }
}
