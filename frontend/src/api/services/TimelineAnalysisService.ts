/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TimelineAnalysisCreate } from "@models/TimelineAnalysisCreate";
import type { TimelineAnalysisRead } from "@models/TimelineAnalysisRead";
import type { TimelineAnalysisUpdate } from "@models/TimelineAnalysisUpdate";
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
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: TimelineAnalysisCreate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/timeline-analyses",
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
  /**
   * Returns the TimelineAnalyses of the Project
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<TimelineAnalysisRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/timeline-analyses",
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
   * Duplicates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static duplicate({
    projectId,
    timelineAnalysisId,
  }: {
    projectId: number;
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/timeline-analyses/{timeline_analysis_id}/duplicate",
      path: {
        project_id: projectId,
        timeline_analysis_id: timelineAnalysisId,
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
   * Returns the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    timelineAnalysisId,
  }: {
    projectId: number;
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/timeline-analyses/{timeline_analysis_id}",
      path: {
        project_id: projectId,
        timeline_analysis_id: timelineAnalysisId,
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
   * Updates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    timelineAnalysisId,
    requestBody,
  }: {
    projectId: number;
    timelineAnalysisId: number;
    requestBody: TimelineAnalysisUpdate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/timeline-analyses/{timeline_analysis_id}",
      path: {
        project_id: projectId,
        timeline_analysis_id: timelineAnalysisId,
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
   * Removes the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    timelineAnalysisId,
  }: {
    projectId: number;
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/timeline-analyses/{timeline_analysis_id}",
      path: {
        project_id: projectId,
        timeline_analysis_id: timelineAnalysisId,
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
   * Recomputes the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static recompute({
    projectId,
    timelineAnalysisId,
  }: {
    projectId: number;
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/timeline-analyses/{timeline_analysis_id}/recompute",
      path: {
        project_id: projectId,
        timeline_analysis_id: timelineAnalysisId,
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
}
