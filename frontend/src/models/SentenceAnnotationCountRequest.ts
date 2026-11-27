/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SentenceAnnotationCountRequest = {
  /**
   * The User whose SentenceAnnotations are counted
   */
  user_id: number;
  /**
   * The SourceDocuments to count in
   */
  sdoc_ids: Array<number>;
  /**
   * The Codes to count
   */
  code_ids: Array<number>;
};
