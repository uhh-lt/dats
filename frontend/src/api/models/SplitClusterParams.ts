/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SplitClusterParams = {
  /**
   * Type of the PerspectivesJob
   */
  perspectives_job_type?: string;
  /**
   * ID of the cluster to split.
   */
  cluster_id: number;
  /**
   * Number of clusters to split the cluster into. Must be greater than 1. If not set, the cluster will be split automatically.
   */
  split_into: number | null;
};
