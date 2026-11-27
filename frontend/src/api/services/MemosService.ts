/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { MemoCreate } from "@models/MemoCreate";
import type { MemoRead } from "@models/MemoRead";
import type { MemoSuggestionRequest } from "@models/MemoSuggestionRequest";
import type { MemoUpdate } from "@models/MemoUpdate";
import type { MemoUpdateBulk } from "@models/MemoUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MemosService {
  /**
   * Creates a Memo attached to the given object and returns it.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static create({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memos of the Project, optionally filtered by the attached object (attached_object_id needs attached_object_type), the author (user_id) and the memos the current user opened, most recently opened first (recent), at most limit.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    attachedObjectType,
    attachedObjectId,
    userId,
    recent = false,
    limit,
  }: {
    projectId: number;
    attachedObjectType?: AttachedObjectType | null;
    attachedObjectId?: number | null;
    userId?: number | null;
    recent?: boolean;
    limit?: number | null;
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
        recent: recent,
        limit: limit,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memos with the given IDs.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Memos with the given IDs.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteBulk({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Records that the current user opened the Memo with the given ID and returns the Memo
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static markRecent({ projectId, memoId }: { projectId: number; memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/memos/{memo_id}/mark-recent",
      path: {
        project_id: projectId,
        memo_id: memoId,
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
   * Generates a 1–2 sentence memo suggestion using LLM based on the attached object
   * @returns string Successful Response
   * @throws ApiError
   */
  public static computeSuggestion({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: MemoSuggestionRequest;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/memos/suggestion",
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
