/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_classifier_compute_dataset_statistics } from "../models/Body_classifier_compute_dataset_statistics";
import type { ClassifierData } from "../models/ClassifierData";
import type { ClassifierJobInput } from "../models/ClassifierJobInput";
import type { ClassifierJobRead } from "../models/ClassifierJobRead";
import type { ClassifierModel } from "../models/ClassifierModel";
import type { ClassifierRead } from "../models/ClassifierRead";
import type { ClassifierUpdate } from "../models/ClassifierUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ClassifierService {
  /**
   * Returns all Classifiers of the Project with the given ID
   * @returns ClassifierRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projId }: { projId: number }): CancelablePromise<Array<ClassifierRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/classifier/project/{proj_id}",
      path: {
        proj_id: projId,
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
   * @returns ClassifierData Successful Response
   * @throws ApiError
   */
  public static computeDatasetStatistics({
    projId,
    model,
    requestBody,
  }: {
    projId: number;
    model: ClassifierModel;
    requestBody: Body_classifier_compute_dataset_statistics;
  }): CancelablePromise<Array<ClassifierData>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/classifier/project/{proj_id}/datasetstatistics",
      path: {
        proj_id: projId,
      },
      query: {
        model: model,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start Classifier job
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static startClassifierJob({
    requestBody,
  }: {
    requestBody: ClassifierJobInput;
  }): CancelablePromise<ClassifierJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/classifier/classifier",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Classifier job
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static getClassifierJobById({ jobId }: { jobId: string }): CancelablePromise<ClassifierJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/classifier/classifier/{job_id}",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort Classifier job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortClassifierJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/classifier/classifier/{job_id}/abort",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry Classifier job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryClassifierJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/classifier/classifier/{job_id}/retry",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all Classifier jobs by project
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static getClassifierJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ClassifierJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/classifier/classifier/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
