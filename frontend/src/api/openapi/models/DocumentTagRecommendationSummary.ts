/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagRecommendationSummary = {
  /**
   * Unique identifier for the recommendation
   */
  recommendation_id: number;
  /**
   * Filename of the source document
   */
  source_document: string;
  /**
   * ID of the predicted tag
   */
  predicted_tag_id: number;
  /**
   * Name of the predicted tag
   */
  predicted_tag: string;
  /**
   * Confidence score of the predicition
   */
  prediction_score: number;
};
