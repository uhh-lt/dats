/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeStatisticsRequest } from "@models/CodeStatisticsRequest";
import type { SpanEntityStat } from "@models/SpanEntityStat";
import type { TagStat } from "@models/TagStat";
import type { TagStatisticsRequest } from "@models/TagStatisticsRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class StatisticsService {
  /**
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns SpanEntityStat Successful Response
   * @throws ApiError
   */
  public static computeCodeStatistics({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: CodeStatisticsRequest;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/statistics/codes",
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
   * Returns Stat for the given SourceDocuments.
   * @returns TagStat Successful Response
   * @throws ApiError
   */
  public static computeTagStatistics({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: TagStatisticsRequest;
  }): CancelablePromise<Array<TagStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/statistics/tags",
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
