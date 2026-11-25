/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanEntityStat } from "@models/SpanEntityStat";
import type { TagStat } from "@models/TagStat";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class StatisticsService {
  /**
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns SpanEntityStat Successful Response
   * @throws ApiError
   */
  public static filterCodeStats({
    projectId,
    codeId,
    requestBody,
    sortByGlobal = false,
    topK = 20,
  }: {
    projectId: number;
    codeId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/statistics/code",
      query: {
        project_id: projectId,
        code_id: codeId,
        sort_by_global: sortByGlobal,
        top_k: topK,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Stat for the given SourceDocuments.
   * @returns TagStat Successful Response
   * @throws ApiError
   */
  public static filterTagStats({
    requestBody,
    sortByGlobal = false,
    topK = 20,
  }: {
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<TagStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/statistics/tag",
      query: {
        sort_by_global: sortByGlobal,
        top_k: topK,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
