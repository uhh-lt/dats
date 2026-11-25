/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { MemoCreate } from "@models/MemoCreate";
import type { MemoRead } from "@models/MemoRead";
import type { MemoUpdate } from "@models/MemoUpdate";
import type { MemoUpdateBulk } from "@models/MemoUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MemoService {
  /**
   * Creates a Memo attached to the given object and returns it.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static createMemo({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/memos",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memos of the Project, optionally filtered by the attached object (attached_object_id needs attached_object_type) and the author (user_id).
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    attachedObjectType,
    attachedObjectId,
    userId,
  }: {
    projectId: number;
    attachedObjectType?: AttachedObjectType | null;
    attachedObjectId?: number | null;
    userId?: number | null;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/memos",
      path: {
        project_id: projectId,
      },
      query: {
        attached_object_type: attachedObjectType,
        attached_object_id: attachedObjectId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the current user's most recently opened Memos in the project
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getRecentMemos({
    projectId,
    limit = 10,
  }: {
    projectId: number;
    limit?: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/memos/recent",
      path: {
        project_id: projectId,
      },
      query: {
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo with the given ID.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getById({ projectId, memoId }: { projectId: number; memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/memos/{memo_id}",
      path: {
        project_id: projectId,
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memo with the given ID.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    memoId,
    requestBody,
  }: {
    projectId: number;
    memoId: number;
    requestBody: MemoUpdate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/memos/{memo_id}",
      path: {
        project_id: projectId,
        memo_id: memoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Memo with the given ID.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ projectId, memoId }: { projectId: number; memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/memos/{memo_id}",
      path: {
        project_id: projectId,
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memos with the given IDs.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateMemosBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<MemoUpdateBulk>;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/memos/bulk",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Memos with the given IDs.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteMemosBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/memos/bulk",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Records that the current user opened the Memo with the given ID
   * @returns void
   * @throws ApiError
   */
  public static recordRecentMemo({
    projectId,
    memoId,
  }: {
    projectId: number;
    memoId: number;
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/memos/{memo_id}/recent",
      path: {
        project_id: projectId,
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Generates a 1–2 sentence memo suggestion using LLM based on the attached object
   * @returns string Successful Response
   * @throws ApiError
   */
  public static generateMemoSuggestion({
    projectId,
    attachedObjectType,
    attachedObjectId,
    model,
  }: {
    projectId: number;
    attachedObjectType: AttachedObjectType;
    attachedObjectId: number;
    model: string;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/memos/suggest",
      path: {
        project_id: projectId,
      },
      query: {
        attached_object_type: attachedObjectType,
        attached_object_id: attachedObjectId,
        model: model,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
