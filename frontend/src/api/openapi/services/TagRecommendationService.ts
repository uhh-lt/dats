/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagRecommendationLinkRead } from "../models/TagRecommendationLinkRead";
import type { TagRecommendationResult } from "../models/TagRecommendationResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TagRecommendationService {
  /**
   * Retrieve all finished tag recommendation MLJobs.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAllTagrecommendationJobs({ projectId }: { projectId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tagrecommendation/{project_id}",
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
   * @returns TagRecommendationResult Successful Response
   * @throws ApiError
   */
  public static getAllTagrecommendationsFromJob({
    mlJobId,
  }: {
    mlJobId: string;
  }): CancelablePromise<Array<TagRecommendationResult>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tagrecommendation/job/{ml_job_id}",
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
   * @returns TagRecommendationLinkRead Successful Response
   * @throws ApiError
   */
  public static updateRecommendations({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<TagRecommendationLinkRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/tagrecommendation/review_recommendations",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
