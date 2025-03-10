/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_documentTagRecommendationJob_update_recommendations } from "../models/Body_documentTagRecommendationJob_update_recommendations";
import type { DocumentTagRecommendationJobCreate } from "../models/DocumentTagRecommendationJobCreate";
import type { DocumentTagRecommendationJobRead } from "../models/DocumentTagRecommendationJobRead";
import type { DocumentTagRecommendationSummary } from "../models/DocumentTagRecommendationSummary";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentTagRecommendationJobService {
  /**
   * Creates a new Document Tag Recommendation Task and returns it.
   * @returns DocumentTagRecommendationJobRead Successful Response
   * @throws ApiError
   */
  public static createNewDocTagRecTask({
    requestBody,
  }: {
    requestBody: DocumentTagRecommendationJobCreate;
  }): CancelablePromise<DocumentTagRecommendationJobRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/doctagrecommendationjob",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retrieve all document tag recommendations for the given task ID.
   * Retrieves document tag recommendations based on the specified task ID.
   *
   * ### Response Format:
   * The endpoint returns a list of recommendations, where each recommendation
   * is represented as a DocumentTagRecommendationSummary DTO with the following structure:
   *
   * ```python
   * {
   * "recommendation_id": int,  # Unique identifier for the recommendation
   * "source_document": str,    # Name of the source document
   * "predicted_tag_id": int,   # ID of the predicted tag
   * "predicted_tag": str,      # Name of the predicted tag
   * "prediction_score": float  # Confidence score of the prediction
   * }
   * ```
   *
   * ### Error Handling:
   * - Returns HTTP 404 if no recommendations are found for the given task ID.
   * @returns DocumentTagRecommendationSummary Successful Response
   * @throws ApiError
   */
  public static getRecommendationsFromTaskEndpoint({
    taskId,
  }: {
    taskId: number;
  }): CancelablePromise<Array<DocumentTagRecommendationSummary>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/doctagrecommendationjob/{task_id}",
      path: {
        task_id: taskId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static updateRecommendations({
    requestBody,
  }: {
    requestBody: Body_documentTagRecommendationJob_update_recommendations;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctagrecommendationjob/update_recommendations",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
