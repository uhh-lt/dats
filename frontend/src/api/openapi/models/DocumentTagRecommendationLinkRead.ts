/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagRecommendationLinkRead = {
  /**
   * Identifier of the corresponding ML Job.
   */
  ml_job_id: string;
  /**
   * ID of the source document
   */
  source_document_id: number;
  /**
   * ID of the predicted tag
   */
  predicted_tag_id: number;
  /**
   * Prediction score of the tag
   */
  prediction_score: number;
  /**
   * Reviewed status of the recommendation
   */
  is_reviewed?: boolean;
};
