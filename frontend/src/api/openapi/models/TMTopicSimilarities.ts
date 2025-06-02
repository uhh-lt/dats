/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TopicRead } from "./TopicRead";
export type TMTopicSimilarities = {
  /**
   * ID of the aspect this visualization belongs to
   */
  aspect_id: number;
  /**
   * List of topics in the visualization
   */
  topics: Array<TopicRead>;
  /**
   * Matrix of topic similarities, where similarities[i][j] is the similarity between topics[i] and topics[j]
   */
  similarities: Array<Array<number>>;
};
