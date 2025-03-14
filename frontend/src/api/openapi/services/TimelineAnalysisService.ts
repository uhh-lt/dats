/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisCreate } from "../models/TimelineAnalysisCreate";
import type { TimelineAnalysisRead } from "../models/TimelineAnalysisRead";
import type { TimelineAnalysisUpdate } from "../models/TimelineAnalysisUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TimelineAnalysisService {
  /**
   * Creates an TimelineAnalysis
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static create({
    requestBody,
  }: {
    requestBody: TimelineAnalysisCreate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/timelineAnalysis",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    timelineAnalysisId,
    requestBody,
  }: {
    timelineAnalysisId: number;
    requestBody: TimelineAnalysisUpdate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the TimelineAnalysis of the Project with the given ID and the logged-in User if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getByProjectAndUser({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<TimelineAnalysisRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/timelineAnalysis/project/{project_id}/user",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static recomputeById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/timelineAnalysis/recompute/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Duplicates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static duplicateById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/timelineAnalysis/duplicate/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
