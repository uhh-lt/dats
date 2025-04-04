/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SentenceAnnotationParams = {
  llm_job_type: string;
  /**
   * IDs of the source documents to analyse
   */
  sdoc_ids: Array<number>;
  /**
   * IDs of the codes to use for the sentence annotation
   */
  code_ids: Array<number>;
  /**
   * Delete existing annotations before creating new ones
   */
  delete_existing_annotations?: boolean;
};
