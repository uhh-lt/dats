/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClusterRead } from "./ClusterRead";
import type { PerspectivesDoc } from "./PerspectivesDoc";
export type PerspectivesVisualization = {
  /**
   * ID of the aspect this visualization belongs to
   */
  aspect_id: number;
  /**
   * List of clusters in the visualization
   */
  clusters: Array<ClusterRead>;
  /**
   * List of documents in the visualization
   */
  docs: Array<PerspectivesDoc>;
};
