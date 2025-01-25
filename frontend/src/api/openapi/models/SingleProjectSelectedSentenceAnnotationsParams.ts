/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SingleProjectSelectedSentenceAnnotationsParams = {
  /**
   * The ID of the Project to export from
   */
  project_id: number;
  export_job_type: string;
  /**
   * IDs of the sentence annotations to export
   */
  sentence_annotation_ids: Array<number>;
};
