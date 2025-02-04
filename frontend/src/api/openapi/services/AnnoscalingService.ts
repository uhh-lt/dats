/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnoscalingConfirmSuggest } from "../models/AnnoscalingConfirmSuggest";
import type { AnnoscalingResult } from "../models/AnnoscalingResult";
import type { AnnoscalingSuggest } from "../models/AnnoscalingSuggest";
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
    requestBody,
  }: {
    requestBody: AnnoscalingSuggest;
  }): CancelablePromise<Array<AnnoscalingResult>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/annoscaling/suggest",
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
   * @returns any Successful Response
   * @throws ApiError
   */
  public static confirmSuggestions({
    requestBody,
  }: {
    requestBody: AnnoscalingConfirmSuggest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/annoscaling/confirm_suggestions",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
