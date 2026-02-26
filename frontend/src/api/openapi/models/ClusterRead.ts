/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClusterRead = {
  /**
   * ID of the cluster
   */
  id: number;
  /**
   * ID of the aspect this cluster belongs to
   */
  aspect_id: number;
  /**
   * Whether the cluster is an outlier
   */
  is_outlier: boolean;
  /**
   * Name of the cluster
   */
  name: string;
  /**
   * Description of the cluster
   */
  description: string;
  /**
   * X coordinate for visualization
   */
  x: number;
  /**
   * Y coordinate for visualization
   */
  y: number;
  /**
   * Top words associated with the cluster
   */
  top_words: Array<string> | null;
  /**
   * Scores of the top words
   */
  top_word_scores: Array<number> | null;
  /**
   * IDs of top documents for the cluster
   */
  top_docs: Array<number> | null;
};
