/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TopicModelingParams = {
  ml_job_type: string;
  /**
   * Specifying the number of topics will reduce the initial number of topics to the value specified
   */
  nr_topics?: number;
  /**
   * Minimum amount of files needed where the topics exists in order to be a topic
   */
  min_topic_size?: number;
  /**
   * The number of words per topic to extract.
   */
  top_n_words?: number;
  /**
   * Whether to recompute already processed documents
   */
  recompute?: boolean;
};
