/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TopicRead = {
  /**
   * ID of the topic
   */
  id: number;
  /**
   * ID of the aspect this topic belongs to
   */
  aspect_id: number;
  /**
   * ID of the parent topic, if any
   */
  parent_topic_id: number | null;
  /**
   * Whether the topic is an outlier
   */
  is_outlier: boolean;
  /**
   * Name of the topic
   */
  name: string;
  /**
   * Description of the topic
   */
  description: string;
  /**
   * Hierarchical level of the topic
   */
  level: number;
  /**
   * X coordinate for visualization
   */
  x: number;
  /**
   * Y coordinate for visualization
   */
  y: number;
  /**
   * Top words associated with the topic
   */
  top_words: Array<string> | null;
  /**
   * Scores of the top words
   */
  top_word_scores: Array<number> | null;
  /**
   * IDs of top documents for the topic
   */
  top_docs: Array<number> | null;
};
