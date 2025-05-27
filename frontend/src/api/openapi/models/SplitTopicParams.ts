/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SplitTopicParams = {
  /**
   * Type of the TMJob
   */
  tm_job_type?: string;
  /**
   * ID of the topic to split.
   */
  topic_id: number;
  /**
   * Number of topics to split the topic into. Must be greater than 1. If not set, the topic will be split automatically.
   */
  split_into: number | null;
};
