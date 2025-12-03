/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PipelineSettings = {
  /**
   * Number of neighbors for UMAP dimensionality reduction
   */
  umap_n_neighbors?: number;
  /**
   * Minimum distance for UMAP dimensionality reduction
   */
  umap_min_dist?: number;
  /**
   * Metric for UMAP dimensionality reduction
   */
  umap_metric?: string;
  /**
   * Minimum samples for HDBSCAN clustering
   */
  hdbscan_min_samples?: number;
  /**
   * Metric for HDBSCAN clustering
   */
  hdbscan_metric?: string;
  /**
   * Number of keywords to extract per cluster
   */
  num_keywords?: number;
};
