/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TMDoc } from "./TMDoc";
import type { TopicRead } from "./TopicRead";
export type TMVisualization = {
  /**
   * ID of the aspect this visualization belongs to
   */
  aspect_id: number;
  /**
   * List of topics in the visualization
   */
  topics: Array<TopicRead>;
  /**
   * List of documents in the visualization
   */
  docs: Array<TMDoc>;
};
