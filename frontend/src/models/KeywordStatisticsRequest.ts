/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type KeywordStatisticsRequest = {
  /**
   * The SourceDocuments to count in
   */
  sdoc_ids: Array<number>;
  /**
   * Sort by the count in the whole Project
   */
  sort_by_global?: boolean;
  /**
   * Number of keywords to return
   */
  top_k?: number;
};
