/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ChangeClusterParams = {
  /**
   * Type of the PerspectivesJob
   */
  perspectives_job_type?: string;
  /**
   * List of source document IDs to change the cluster for.
   */
  sdoc_ids: Array<number>;
  /**
   * ID of the cluster to change to. (-1 will be treated as 'removing' the documents / marking them as outliers)
   */
  cluster_id: number;
};
