/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClusterRead } from "./ClusterRead";
export type PerspectivesClusterSimilarities = {
  /**
   * ID of the aspect this visualization belongs to
   */
  aspect_id: number;
  /**
   * List of clusters in the visualization
   */
  clusters: Array<ClusterRead>;
  /**
   * Matrix of cluster similarities, where similarities[i][j] is the similarity between clusters[i] and clusters[j]
   */
  similarities: Array<Array<number>>;
};
