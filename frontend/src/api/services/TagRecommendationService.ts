/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagRecommendationLinkRead } from "@models/TagRecommendationLinkRead";
import type { TagRecommendationResult } from "@models/TagRecommendationResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TagRecommendationService {
  /**
   * Retrieve all (non-reviewed) document tag recommendations of the given tag recommendation job.
   * @returns TagRecommendationResult Successful Response
   * @throws ApiError
   */
  public static getAllTagrecommendationsFromJob({
    jobId,
  }: {
    jobId: string;
  }): CancelablePromise<Array<TagRecommendationResult>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tagrecommendation/job/{job_id}",
      path: {
        job_id: jobId,
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
