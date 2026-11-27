/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxSearchViewCreate } from "@models/BBoxSearchViewCreate";
import type { BBoxSearchViewRead } from "@models/BBoxSearchViewRead";
import type { BBoxSearchViewUpdate } from "@models/BBoxSearchViewUpdate";
import type { MemoSearchViewCreate } from "@models/MemoSearchViewCreate";
import type { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import type { MemoSearchViewUpdate } from "@models/MemoSearchViewUpdate";
import type { SearchEntityType } from "@models/SearchEntityType";
import type { SearchViewReorder } from "@models/SearchViewReorder";
import type { SentenceSearchViewCreate } from "@models/SentenceSearchViewCreate";
import type { SentenceSearchViewRead } from "@models/SentenceSearchViewRead";
import type { SentenceSearchViewUpdate } from "@models/SentenceSearchViewUpdate";
import type { SpanSearchViewCreate } from "@models/SpanSearchViewCreate";
import type { SpanSearchViewRead } from "@models/SpanSearchViewRead";
import type { SpanSearchViewUpdate } from "@models/SpanSearchViewUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchViewService {
  /**
   * Creates a personal search view
   * @returns any Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: MemoSearchViewCreate | SpanSearchViewCreate | SentenceSearchViewCreate | BBoxSearchViewCreate;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/search-views",
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
   * Returns the current user's search views of an entity type in a project
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    entityType,
  }: {
    projectId: number;
    entityType: SearchEntityType;
  }): CancelablePromise<Array<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/search-views",
      path: {
        project_id: projectId,
      },
      query: {
        entity_type: entityType,
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
   * Reorders the current user's search views of an entity type in a project
   * @returns any Successful Response
   * @throws ApiError
   */
  public static reorder({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SearchViewReorder;
  }): CancelablePromise<Array<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/search-views/reorder",
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
   * Updates a personal search view
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    searchViewId,
    requestBody,
  }: {
    projectId: number;
    searchViewId: number;
    requestBody: MemoSearchViewUpdate | SpanSearchViewUpdate | SentenceSearchViewUpdate | BBoxSearchViewUpdate;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/search-views/{search_view_id}",
      path: {
        project_id: projectId,
        search_view_id: searchViewId,
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
   * Deletes a personal search view
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    searchViewId,
  }: {
    projectId: number;
    searchViewId: number;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/search-views/{search_view_id}",
      path: {
        project_id: projectId,
        search_view_id: searchViewId,
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
