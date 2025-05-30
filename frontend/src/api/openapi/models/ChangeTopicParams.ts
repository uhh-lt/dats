/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChangeTopicParams = {
  /**
   * Type of the TMJob
   */
  tm_job_type?: string;
  /**
   * ID of the aspect to which the documents belong.
   */
  aspect_id: number;
  /**
   * List of source document IDs to change the topic for.
   */
  sdoc_ids: Array<number>;
  /**
   * ID of the topic to change to. (-1 will be treated as 'removing' the documents / marking them as outliers)
   */
  topic_id: number;
};
