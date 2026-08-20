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
    requestBody,
  }: {
    requestBody: MemoSearchViewCreate | SpanSearchViewCreate | SentenceSearchViewCreate | BBoxSearchViewCreate;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/searchView",
      body: requestBody,
      mediaType: "application/json",
      errors: {
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
      url: "/searchView/project/{project_id}",
      path: {
        project_id: projectId,
      },
      query: {
        entity_type: entityType,
      },
      errors: {
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
    entityType,
    requestBody,
  }: {
    projectId: number;
    entityType: SearchEntityType;
    requestBody: SearchViewReorder;
  }): CancelablePromise<Array<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/searchView/project/{project_id}/order",
      path: {
        project_id: projectId,
      },
      query: {
        entity_type: entityType,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates a personal search view
   * @returns any Successful Response
   * @throws ApiError
   */
  public static update({
    viewId,
    requestBody,
  }: {
    viewId: number;
    requestBody: MemoSearchViewUpdate | SpanSearchViewUpdate | SentenceSearchViewUpdate | BBoxSearchViewUpdate;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/searchView/{view_id}",
      path: {
        view_id: viewId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes a personal search view
   * @returns any Successful Response
   * @throws ApiError
   */
  public static delete({
    viewId,
  }: {
    viewId: number;
  }): CancelablePromise<MemoSearchViewRead | SpanSearchViewRead | SentenceSearchViewRead | BBoxSearchViewRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/searchView/{view_id}",
      path: {
        view_id: viewId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
