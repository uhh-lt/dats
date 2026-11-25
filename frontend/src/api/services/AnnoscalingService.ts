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
export class AnnoscalingService {
  /**
   * Suggest annotations
   * Suggest annotations
   * @returns AnnoscalingResult Successful Response
   * @throws ApiError
   */
  public static suggest({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AnnoscalingSuggest;
  }): CancelablePromise<Array<AnnoscalingResult>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/annotation-scaling/suggest",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
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
      method: "POST",
      url: "/projects/{project_id}/annotation-scaling/confirm-suggestions",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
