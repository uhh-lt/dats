/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDocumentRead } from "../models/AnnotationDocumentRead";
import type { CodeRead } from "../models/CodeRead";
import type { MemoRead } from "../models/MemoRead";
import type { ProjectRead } from "../models/ProjectRead";
import type { PublicUserRead } from "../models/PublicUserRead";
import type { UserRead } from "../models/UserRead";
import type { UserUpdate } from "../models/UserUpdate";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class UserService {
  /**
   * Returns the current user
   * Returns the current (logged in) user
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/me",
    });
  }

  /**
   * Returns the User
   * Returns the User with the given ID if it exists
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getById({ userId }: { userId: number }): CancelablePromise<PublicUserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the User
   * Removes the User with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ userId }: { userId: number }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the User
   * Updates the User with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: UserUpdate;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/{user_id}",
      path: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Users
   * Returns all Users that exist in the system
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getAll({
    skip,
    limit,
  }: {
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<PublicUserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user",
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Projects of the User
   * Returns all Projects of the User with the given ID
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getUserProjects({ userId }: { userId: number }): CancelablePromise<Array<ProjectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}/project",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Codes of the User
   * Returns all Codes of the User with the given ID
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getUserCodes({ userId }: { userId: number }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}/code",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Memos of the User
   * Returns all Memos of the User with the given ID
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemos({ userId }: { userId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}/memo",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Adocs of the User
   * Returns all Adocs of the User with the given ID
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getUserAdocs({ userId }: { userId: number }): CancelablePromise<Array<AnnotationDocumentRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}/adocs",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns sdoc ids of sdocs the User recently modified (annotated)
   * Returns the top k sdoc ids that the User recently modified (annotated)
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static recentActivity({
    userId,
    k,
  }: {
    userId: number;
    k: number;
  }): CancelablePromise<Array<AnnotationDocumentRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{user_id}/recent_activity",
      path: {
        user_id: userId,
      },
      query: {
        k: k,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
