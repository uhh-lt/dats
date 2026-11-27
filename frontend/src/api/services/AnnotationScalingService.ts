/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnoscalingConfirmSuggest } from "@models/AnnoscalingConfirmSuggest";
import type { AnnoscalingResult } from "@models/AnnoscalingResult";
import type { AnnoscalingSuggest } from "@models/AnnoscalingSuggest";
import type { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnnotationScalingService {
  /**
   * Suggest annotations
   * Suggest annotations
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static confirmSuggestions({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AnnoscalingConfirmSuggest;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/annotation-scaling/suggestions/confirm",
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
   * Suggest annotations
   * Suggest annotations
   * @returns AnnoscalingResult Successful Response
   * @throws ApiError
   */
  public static computeSuggestions({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AnnoscalingSuggest;
  }): CancelablePromise<Array<AnnoscalingResult>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/annotation-scaling/suggestions",
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
}
