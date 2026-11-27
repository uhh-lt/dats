/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureActivation } from "@models/FeatureActivation";
import type { ProjectFeatureRead } from "@models/ProjectFeatureRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FeaturesService {
  /**
   * Returns the state of every Feature in the Project: enabled, status, ready and document counts
   * @returns ProjectFeatureRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ProjectFeatureRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/features",
      path: {
        project_id: projectId,
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
  /**
   * Enables the disabled Feature in the Project and computes its data for all documents. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static enable({
    projectId,
    feature,
    requestBody,
  }: {
    projectId: number;
    feature: string;
    requestBody: FeatureActivation;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/features/{feature}/enable",
      path: {
        project_id: projectId,
        feature: feature,
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
   * Disables the partly or fully available Feature in the Project; its data is kept. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static disable({
    projectId,
    feature,
  }: {
    projectId: number;
    feature: string;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/features/{feature}/disable",
      path: {
        project_id: projectId,
        feature: feature,
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
  /**
   * Completes the partly available Feature: computes its data for the documents that lack it. Returns the enabled Features
   * @returns string Successful Response
   * @throws ApiError
   */
  public static complete({
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
      url: "/projects/{project_id}/features/{feature}/complete",
      path: {
        project_id: projectId,
        feature: feature,
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
