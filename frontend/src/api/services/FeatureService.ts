/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "@models/Feature";
import type { FeatureActivation } from "@models/FeatureActivation";
import type { FeatureRead } from "@models/FeatureRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FeatureService {
  /**
   * Returns all Features a Project can enable, with the Features they require
   * @returns FeatureRead Successful Response
   * @throws ApiError
   */
  public static getAll(): CancelablePromise<Array<FeatureRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/feature",
    });
  }
  /**
   * Enables the Feature in the Project, or completes it: computes its data for the documents that lack it. Returns the enabled Features
   * @returns Feature Successful Response
   * @throws ApiError
   */
  public static activateFeature({
    projectId,
    feature,
    requestBody,
  }: {
    projectId: number;
    feature: Feature;
    requestBody: FeatureActivation;
  }): CancelablePromise<Array<Feature>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/feature/project/{project_id}/{feature}",
      path: {
        project_id: projectId,
        feature: feature,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Disables the Feature in the Project; its data is kept. Returns the enabled Features
   * @returns Feature Successful Response
   * @throws ApiError
   */
  public static disableFeature({
    projectId,
    feature,
  }: {
    projectId: number;
    feature: Feature;
  }): CancelablePromise<Array<Feature>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/feature/project/{project_id}/{feature}",
      path: {
        project_id: projectId,
        feature: feature,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
