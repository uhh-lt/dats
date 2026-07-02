/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MergeClustersParams = {
  /**
   * Type of the PerspectivesJob
   */
  perspectives_job_type?: string;
  /**
   * ID of the cluster to keep after merging.
   */
  cluster_to_keep: number;
  /**
   * ID of the cluster to delete after merging.
   */
  cluster_to_merge: number;
};
