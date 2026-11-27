/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
import type { Page_MemoRead_ } from "@models/Page_MemoRead_";
import type { Page_SentenceAnnotationRow_ } from "@models/Page_SentenceAnnotationRow_";
import type { Page_SpanAnnotationRow_ } from "@models/Page_SpanAnnotationRow_";
import type { PaginatedSDocHits } from "@models/PaginatedSDocHits";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import type { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import type { SourceDocumentSearchRequest } from "@models/SourceDocumentSearchRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchService {
  /**
   * Returns Search Info.
   * @returns ColumnInfo_SdocColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocColumns({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SdocColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search/source-documents/columns",
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
   * Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.
   * @returns PaginatedSDocHits Successful Response
   * @throws ApiError
   */
  public static searchSdocs({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentSearchRequest;
  }): CancelablePromise<PaginatedSDocHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/source-documents",
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
   * Returns Memo Table Info.
   * @returns ColumnInfo_MemoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchMemoColumns({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_MemoColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search/memos/columns",
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
   * Queries Memo summaries for a workspace view
   * @returns Page_MemoRead_ Successful Response
   * @throws ApiError
   */
  public static searchMemos({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: QueryRequest_MemoColumns_;
  }): CancelablePromise<Page_MemoRead_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/memos",
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
   * Queries paginated Memo groups for a workspace view
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchMemoGroups({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: GroupQueryRequest_MemoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/memos/groups",
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
   * Returns SpanAnnotationSearch Info.
   * @returns ColumnInfo_SpanColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationColumns({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SpanColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search/span-annotations/columns",
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
   * Returns SpanAnnotationSearch.
   * @returns Page_SpanAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotations({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: QueryRequest_SpanColumns_;
  }): CancelablePromise<Page_SpanAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/span-annotations",
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
   * Returns paginated SpanAnnotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationGroups({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: GroupQueryRequest_SpanColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/span-annotations/groups",
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
   * Returns SentenceAnnotationSearch Info.
   * @returns ColumnInfo_SentAnnoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationColumns({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SentAnnoColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search/sentence-annotations/columns",
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
   * Returns Sentence Annotations.
   * @returns Page_SentenceAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotations({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: QueryRequest_SentAnnoColumns_;
  }): CancelablePromise<Page_SentenceAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/sentence-annotations",
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
   * Returns paginated Sentence Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationGroups({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: GroupQueryRequest_SentAnnoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/sentence-annotations/groups",
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
   * Returns BBoxAnnotationSearch Info.
   * @returns ColumnInfo_BBoxColumns_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationColumns({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_BBoxColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search/bbox-annotations/columns",
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
   * Returns BBox Annotations.
   * @returns Page_BBoxAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotations({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: QueryRequest_BBoxColumns_;
  }): CancelablePromise<Page_BBoxAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/bbox-annotations",
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
   * Returns paginated BBox Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationGroups({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: GroupQueryRequest_BBoxColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search/bbox-annotations/groups",
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
