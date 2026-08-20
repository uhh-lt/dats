/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_search_search_sdocs } from "@models/Body_search_search_sdocs";
import type { ColumnInfo_BBoxColumns_ } from "@models/ColumnInfo_BBoxColumns_";
import type { ColumnInfo_MemoColumns_ } from "@models/ColumnInfo_MemoColumns_";
import type { ColumnInfo_SdocColumns_ } from "@models/ColumnInfo_SdocColumns_";
import type { ColumnInfo_SentAnnoColumns_ } from "@models/ColumnInfo_SentAnnoColumns_";
import type { ColumnInfo_SpanColumns_ } from "@models/ColumnInfo_SpanColumns_";
import type { GroupPage } from "@models/GroupPage";
import type { GroupQueryRequest_BBoxColumns_ } from "@models/GroupQueryRequest_BBoxColumns_";
import type { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import type { GroupQueryRequest_SentAnnoColumns_ } from "@models/GroupQueryRequest_SentAnnoColumns_";
import type { GroupQueryRequest_SpanColumns_ } from "@models/GroupQueryRequest_SpanColumns_";
import type { Page_BBoxAnnotationRow_ } from "@models/Page_BBoxAnnotationRow_";
import type { Page_MemoRow_ } from "@models/Page_MemoRow_";
import type { Page_SentenceAnnotationRow_ } from "@models/Page_SentenceAnnotationRow_";
import type { Page_SpanAnnotationRow_ } from "@models/Page_SpanAnnotationRow_";
import type { PaginatedSDocHits } from "@models/PaginatedSDocHits";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import type { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
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
    searchQuery,
    expertMode,
    highlight,
    requestBody,
    folderId,
    pageNumber,
    pageSize,
    showFolders = true,
    showChildFolders = false,
  }: {
    projectId: number;
    searchQuery: string;
    expertMode: boolean;
    highlight: boolean;
    requestBody: Body_search_search_sdocs;
    folderId?: number | null;
    pageNumber?: number | null;
    pageSize?: number | null;
    showFolders?: boolean;
    showChildFolders?: boolean;
  }): CancelablePromise<PaginatedSDocHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
      query: {
        project_id: projectId,
        search_query: searchQuery,
        expert_mode: expertMode,
        highlight: highlight,
        folder_id: folderId,
        page_number: pageNumber,
        page_size: pageSize,
        show_folders: showFolders,
        show_child_folders: showChildFolders,
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
   * Queries Memo summaries for a workspace view
   * @returns Page_MemoRow_ Successful Response
   * @throws ApiError
   */
  public static searchMemos({
    requestBody,
  }: {
    requestBody: QueryRequest_MemoColumns_;
  }): CancelablePromise<Page_MemoRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Queries paginated Memo groups for a workspace view
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchMemoGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_MemoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo/groups",
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
   * @returns Page_SpanAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_SpanColumns_;
  }): CancelablePromise<Page_SpanAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated SpanAnnotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_SpanColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation/groups",
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
   * @returns Page_SentenceAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_SentAnnoColumns_;
  }): CancelablePromise<Page_SentenceAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated Sentence Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_SentAnnoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation/groups",
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
   * Returns BBox Annotations.
   * @returns Page_BBoxAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_BBoxColumns_;
  }): CancelablePromise<Page_BBoxAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated BBox Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_BBoxColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation/groups",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
