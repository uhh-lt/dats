/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_search_search_sdocs } from "../models/Body_search_search_sdocs";
import type { ColumnInfo_SdocColumns_ } from "../models/ColumnInfo_SdocColumns_";
import type { KeywordStat } from "../models/KeywordStat";
import type { PaginatedSDocHits } from "../models/PaginatedSDocHits";
import type { SpanEntityStat } from "../models/SpanEntityStat";
import type { TagStat } from "../models/TagStat";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchService {
  /**
   * Returns Search Info.
   * @returns ColumnInfo_SdocColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocsInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SdocColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.
   * @returns PaginatedSDocHits Successful Response
   * @throws ApiError
   */
  public static searchSdocs({
    projectId,
    searchQuery,
    expertMode,
    highlight,
    requestBody,
    pageNumber,
    pageSize,
  }: {
    projectId: number;
    searchQuery: string;
    expertMode: boolean;
    highlight: boolean;
    requestBody: Body_search_search_sdocs;
    pageNumber?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<PaginatedSDocHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
      query: {
        project_id: projectId,
        search_query: searchQuery,
        expert_mode: expertMode,
        highlight: highlight,
        page_number: pageNumber,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns SpanEntityStat Successful Response
   * @throws ApiError
   */
  public static filterCodeStats({
    codeId,
    requestBody,
    sortByGlobal = false,
    topK = 20,
  }: {
    codeId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/code_stats_by_sdocs",
      query: {
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
   * Returns KeywordStats for the given SourceDocuments.
   * @returns KeywordStat Successful Response
   * @throws ApiError
   */
  public static filterKeywordStats({
    projectId,
    requestBody,
    sortByGlobal = false,
    topK = 20,
  }: {
    projectId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<KeywordStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/keyword_stats_by_sdocs",
      query: {
        project_id: projectId,
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
      url: "/search/tag_stats_by_sdocs",
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
