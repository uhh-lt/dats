/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagRecommendationResult = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * List of the corresponding DocumentTagRecommendationLinks
   */
  recommendation_ids: Array<number>;
  /**
   * List of current tag IDs for the source document
   */
  current_tag_ids: Array<number>;
  /**
   * List of suggested tag IDs for the source document
   */
  suggested_tag_ids: Array<number>;
  /**
   * List of the scores of the suggested tags
   */
  scores: Array<number>;
};
