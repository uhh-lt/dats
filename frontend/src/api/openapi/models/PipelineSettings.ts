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
   * Number of components for UMAP dimensionality reduction
   */
  umap_n_components?: number;
  /**
   * Minimum distance for UMAP dimensionality reduction
   */
  umap_min_dist?: number;
  /**
   * Metric for UMAP dimensionality reduction
   */
  umap_metric?: string;
  /**
   * Minimum cluster size for HDBSCAN clustering
   */
  hdbscan_min_cluster_size?: number;
  /**
   * Metric for HDBSCAN clustering
   */
  hdbscan_metric?: string;
  /**
   * Number of keywords to extract per cluster
   */
  num_keywords?: number;
  /**
   * Number of top documents to extract per cluster
   */
  num_top_documents?: number;
};
