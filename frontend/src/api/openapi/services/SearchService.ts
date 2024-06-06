/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_search_search_sdocs } from "../models/Body_search_search_sdocs";
import type { ColumnInfo_SearchColumns_ } from "../models/ColumnInfo_SearchColumns_";
import type { KeywordStat } from "../models/KeywordStat";
import type { PaginatedElasticSearchDocumentHits } from "../models/PaginatedElasticSearchDocumentHits";
import type { SimSearchImageHit } from "../models/SimSearchImageHit";
import type { SimSearchQuery } from "../models/SimSearchQuery";
import type { SimSearchSentenceHit } from "../models/SimSearchSentenceHit";
import type { SpanEntityStat } from "../models/SpanEntityStat";
import type { TagStat } from "../models/TagStat";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchService {
  /**
   * Returns Search Info.
   * @returns ColumnInfo_SearchColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocsInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SearchColumns_>> {
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
   * @returns PaginatedElasticSearchDocumentHits Successful Response
   * @throws ApiError
   */
  public static searchSdocs({
    searchQuery,
    projectId,
    expertMode,
    highlight,
    requestBody,
    pageNumber,
    pageSize,
  }: {
    searchQuery: string;
    projectId: number;
    expertMode: boolean;
    highlight: boolean;
    requestBody: Body_search_search_sdocs;
    pageNumber?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<PaginatedElasticSearchDocumentHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
      query: {
        search_query: searchQuery,
        project_id: projectId,
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
  public static searchCodeStats({
    codeId,
    requestBody,
    sortByGlobal = false,
  }: {
    codeId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/code_stats",
      query: {
        code_id: codeId,
        sort_by_global: sortByGlobal,
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
  public static searchKeywordStats({
    projectId,
    requestBody,
    sortByGlobal = false,
    topK = 50,
  }: {
    projectId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<KeywordStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/keyword_stats",
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
  public static searchTagStats({
    requestBody,
    sortByGlobal = false,
  }: {
    requestBody: Array<number>;
    sortByGlobal?: boolean;
  }): CancelablePromise<Array<TagStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/tag_stats",
      query: {
        sort_by_global: sortByGlobal,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns similar sentences according to a textual or visual query.
   * @returns SimSearchSentenceHit Successful Response
   * @throws ApiError
   */
  public static findSimilarSentences({
    requestBody,
  }: {
    requestBody: SimSearchQuery;
  }): CancelablePromise<Array<SimSearchSentenceHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/sentences",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns similar images according to a textual or visual query.
   * @returns SimSearchImageHit Successful Response
   * @throws ApiError
   */
  public static findSimilarImages({
    requestBody,
  }: {
    requestBody: SimSearchQuery;
  }): CancelablePromise<Array<SimSearchImageHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/images",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
