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
   * The endpoint receives IDs of wrongly and correctly tagged document recommendations and sets `is_accepted` to `true` or `false`, while setting the corresponding document tags if `true`.
   * @returns TagRecommendationLinkRead Successful Response
   * @throws ApiError
   */
  public static updateRecommendations({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<TagRecommendationLinkRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tag-recommendations/review",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retrieve all (non-reviewed) document tag recommendations of the given tag recommendation job.
   * @returns TagRecommendationResult Successful Response
   * @throws ApiError
   */
  public static getAllTagrecommendationsFromJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<Array<TagRecommendationResult>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/tag-recommendation/{job_id}/recommendations",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
