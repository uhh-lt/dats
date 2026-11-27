/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CodeStatisticsRequest = {
  /**
   * The Code whose span texts are counted
   */
  code_id: number;
  /**
   * The SourceDocuments to count in
   */
  sdoc_ids: Array<number>;
  /**
   * Sort by the count in the whole Project
   */
  sort_by_global?: boolean;
  /**
   * Number of span texts to return
   */
  top_k?: number;
};
