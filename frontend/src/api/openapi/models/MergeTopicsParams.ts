/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MergeTopicsParams = {
  /**
   * Type of the TMJob
   */
  tm_job_type?: string;
  /**
   * ID of the topic to keep after merging.
   */
  topic_to_keep: number;
  /**
   * ID of the topic to delete after merging.
   */
  topic_to_merge: number;
};
