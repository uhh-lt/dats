/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PerspectivesDoc = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * ID of the cluster this document belongs to
   */
  cluster_id: number;
  /**
   * X coordinate of the document in the visualization
   */
  x: number;
  /**
   * Y coordinate of the document in the visualization
   */
  y: number;
  /**
   * Indicates whether the document<->cluster assignment is accepted by a user
   */
  is_accepted: boolean;
  /**
   * Indicates whether the document is part of the search result
   */
  in_searchresult: boolean;
  /**
   * Indicates whether the document is an outlier
   */
  is_outlier: boolean;
};
