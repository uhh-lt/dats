/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureRead } from "@models/FeatureRead";
import type { InstanceInfo } from "@models/InstanceInfo";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class InfoService {
  /**
   * Info
   * @returns InstanceInfo Successful Response
   * @throws ApiError
   */
  public static info(): CancelablePromise<InstanceInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/info",
    });
  }
  /**
   * Get all available LLM models from the LLM Provider
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getAvailableModels(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/info/llms",
    });
  }
  /**
   * Returns all Features a Project can enable
   * @returns FeatureRead Successful Response
   * @throws ApiError
   */
  public static getFeatures(): CancelablePromise<Array<FeatureRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/info/features",
    });
  }
}
