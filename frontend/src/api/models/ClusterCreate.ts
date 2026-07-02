/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClusterCreate = {
  /**
   * ID of the parent cluster, if any
   */
  parent_cluster_id?: number | null;
  /**
   * ID of the aspect this cluster belongs to
   */
  aspect_id: number;
  /**
   * Hierarchical level of the cluster
   */
  level: number;
  /**
   * Name of the cluster
   */
  name: string;
  /**
   * Description of the cluster
   */
  description: string;
};
