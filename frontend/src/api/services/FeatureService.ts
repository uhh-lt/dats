/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureActivation } from "@models/FeatureActivation";
import type { FeatureRead } from "@models/FeatureRead";
import type { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FeatureService {
  /**
   * Returns all Features a Project can enable
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
   * Returns the state of every Feature in the Project: enabled, status, ready and document counts
   * @returns ProjectFeatureRead Successful Response
   * @throws ApiError
   */
  public static getProjectFeatures({ projectId }: { projectId: number }): CancelablePromise<Array<ProjectFeatureRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/feature/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Enables the disabled Feature in the Project and computes its data for all documents. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static enableFeature({
    projectId,
    feature,
    requestBody,
  }: {
    projectId: number;
    feature: string;
    requestBody: FeatureActivation;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/feature/project/{project_id}/{feature}/enable",
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
   * Completes the partly available Feature: computes its data for the documents that lack it. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static completeFeature({
    projectId,
    feature,
    requestBody,
  }: {
    projectId: number;
    feature: string;
    requestBody: FeatureActivation;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/feature/project/{project_id}/{feature}/complete",
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
   * Disables the partly or fully available Feature in the Project; its data is kept. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static disableFeature({
    projectId,
    feature,
  }: {
    projectId: number;
    feature: string;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/feature/project/{project_id}/{feature}/disable",
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
