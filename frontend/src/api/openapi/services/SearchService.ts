/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationSearchResult } from "../models/BBoxAnnotationSearchResult";
import type { Body_search_search_bbox_annotations } from "../models/Body_search_search_bbox_annotations";
import type { Body_search_search_memos } from "../models/Body_search_search_memos";
import type { Body_search_search_sdocs } from "../models/Body_search_search_sdocs";
import type { Body_search_search_sentence_annotations } from "../models/Body_search_search_sentence_annotations";
import type { Body_search_search_span_annotations } from "../models/Body_search_search_span_annotations";
import type { ColumnInfo_BBoxColumns_ } from "../models/ColumnInfo_BBoxColumns_";
import type { ColumnInfo_MemoColumns_ } from "../models/ColumnInfo_MemoColumns_";
import type { ColumnInfo_SdocColumns_ } from "../models/ColumnInfo_SdocColumns_";
import type { ColumnInfo_SentAnnoColumns_ } from "../models/ColumnInfo_SentAnnoColumns_";
import type { ColumnInfo_SpanColumns_ } from "../models/ColumnInfo_SpanColumns_";
import type { PaginatedElasticSearchHits } from "../models/PaginatedElasticSearchHits";
import type { PaginatedSDocHits } from "../models/PaginatedSDocHits";
import type { SentenceAnnotationSearchResult } from "../models/SentenceAnnotationSearchResult";
import type { SpanAnnotationSearchResult } from "../models/SpanAnnotationSearchResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchService {
  /**
   * Returns Search Info.
   * @returns ColumnInfo_SdocColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocInfo({
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
    folderId,
    searchQuery,
    expertMode,
    highlight,
    requestBody,
    pageNumber,
    pageSize,
  }: {
    projectId: number;
    folderId: number | null;
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
        folder_id: folderId,
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
   * Returns Memo Table Info.
   * @returns ColumnInfo_MemoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchMemoInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_MemoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Memo Ids that match the query parameters.
   * @returns PaginatedElasticSearchHits Successful Response
   * @throws ApiError
   */
  public static searchMemos({
    searchQuery,
    projectId,
    searchContent,
    pageNumber,
    pageSize,
    requestBody,
  }: {
    searchQuery: string;
    projectId: number;
    searchContent: boolean;
    pageNumber: number;
    pageSize: number;
    requestBody: Body_search_search_memos;
  }): CancelablePromise<PaginatedElasticSearchHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo",
      query: {
        search_query: searchQuery,
        project_id: projectId,
        search_content: searchContent,
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
   * Returns SpanAnnotationSearch Info.
   * @returns ColumnInfo_SpanColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SpanColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotationSearch.
   * @returns SpanAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotations({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_search_search_span_annotations;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<SpanAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation",
      query: {
        project_id: projectId,
        page: page,
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
   * Returns SentenceAnnotationSearch Info.
   * @returns ColumnInfo_SentAnnoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SentAnnoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Sentence Annotations.
   * @returns SentenceAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotations({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_search_search_sentence_annotations;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<SentenceAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation",
      query: {
        project_id: projectId,
        page: page,
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
   * Returns BBoxAnnotationSearch Info.
   * @returns ColumnInfo_BBoxColumns_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_BBoxColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotationSearchResult.
   * @returns BBoxAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotations({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_search_search_bbox_annotations;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<BBoxAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
