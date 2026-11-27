/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierDatasetStatistics } from "@models/ClassifierDatasetStatistics";
import type { ClassifierDatasetStatisticsRequest } from "@models/ClassifierDatasetStatisticsRequest";
import type { ClassifierInfo } from "@models/ClassifierInfo";
import type { ClassifierRead } from "@models/ClassifierRead";
import type { ClassifierUpdate } from "@models/ClassifierUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ClassifiersService {
  /**
   * Returns classifier models, thresholds, and training defaults
   * @returns ClassifierInfo Successful Response
   * @throws ApiError
   */
  public static getInfo({ projectId }: { projectId: number }): CancelablePromise<ClassifierInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/classifiers/info",
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
   * Returns all Classifiers of the Project
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ClassifierRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/classifiers",
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
   * Updates the Classifier with the given ID.
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    classifierId,
    requestBody,
  }: {
    projectId: number;
    classifierId: number;
    requestBody: ClassifierUpdate;
  }): CancelablePromise<ClassifierRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/classifiers/{classifier_id}",
      path: {
        project_id: projectId,
        classifier_id: classifierId,
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
   * Deletes the Classifier with the given ID.
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    classifierId,
  }: {
    projectId: number;
    classifierId: number;
  }): CancelablePromise<ClassifierRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/classifiers/{classifier_id}",
      path: {
        project_id: projectId,
        classifier_id: classifierId,
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
   * Returns statistics of the dataset that would be created with these parameters
   * @returns ClassifierDatasetStatistics Successful Response
   * @throws ApiError
   */
  public static computeDatasetStatistics({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ClassifierDatasetStatisticsRequest;
  }): CancelablePromise<ClassifierDatasetStatistics> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/classifiers/dataset-statistics",
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
