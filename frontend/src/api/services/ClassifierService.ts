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
export class ClassifierService {
  /**
   * Returns classifier models, thresholds, and training defaults
   * @returns ClassifierInfo Successful Response
   * @throws ApiError
   */
  public static getClassifierInfo(): CancelablePromise<ClassifierInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/classifier/info",
    });
  }
  /**
   * Returns all Classifiers of the Project with the given ID
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ClassifierRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/classifier/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
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
    classifierId,
    requestBody,
  }: {
    classifierId: number;
    requestBody: ClassifierUpdate;
  }): CancelablePromise<ClassifierRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/classifier/{classifier_id}",
      path: {
        classifier_id: classifierId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Classifier with the given ID.
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ classifierId }: { classifierId: number }): CancelablePromise<ClassifierRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/classifier/{classifier_id}",
      path: {
        classifier_id: classifierId,
      },
      errors: {
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
      url: "/classifier/project/{project_id}/dataset-statistics",
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
