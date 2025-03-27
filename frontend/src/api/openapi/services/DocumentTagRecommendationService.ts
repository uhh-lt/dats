/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentTagRecommendationLinkRead } from "../models/DocumentTagRecommendationLinkRead";
import type { DocumentTagRecommendationResult } from "../models/DocumentTagRecommendationResult";
import type { MLJobRead } from "../models/MLJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentTagRecommendationService {
  /**
   * Retrieve all finished document tag recommendation MLJobs.
   * @returns MLJobRead Successful Response
   * @throws ApiError
   */
  public static getAllDoctagrecommendationJobs({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<MLJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/doctagrecommendation/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retrieve all (non-reviewed) document tag recommendations for the given ml job ID.
   * @returns DocumentTagRecommendationResult Successful Response
   * @throws ApiError
   */
  public static getAllDoctagrecommendationsFromJob({
    mlJobId,
  }: {
    mlJobId: string;
  }): CancelablePromise<Array<DocumentTagRecommendationResult>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/doctagrecommendation/job/{ml_job_id}",
      path: {
        ml_job_id: mlJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.
   * @returns DocumentTagRecommendationLinkRead Successful Response
   * @throws ApiError
   */
  public static updateRecommendations({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<DocumentTagRecommendationLinkRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctagrecommendation/review_recommendations",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
