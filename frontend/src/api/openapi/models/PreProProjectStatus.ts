/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PreProProjectStatus = {
  /**
   * Project ID this PreProProjectStatus refers to.
   */
  project_id: number;
  /**
   * List of active PreprocessingJob UUIDs
   */
  active_prepro_job_ids?: Array<string>;
  /**
   * Number of active PreprocessingJobPayloads
   */
  num_active_prepro_job_payloads: number;
  /**
   * List of erroneous or aborted PreprocessingJobPayload UUIDs
   */
  erroneous_prepro_job_payload_ids: Array<string>;
  /**
   * Number of SourceDocuments preprocessing has finished.
   */
  num_sdocs_finished: number;
  /**
   * Number of total SourceDocuments.
   */
  num_sdocs_total: number;
};
