/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
   * Number of the created annotations per code ID
   */
  annotation_count_by_code_id: Record<string, number>;
  /**
   * Raw LLM responses of the failed requests (only set if an error occurred), cut after a configured number of characters
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
