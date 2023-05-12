/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDocumentRead } from "../models/AnnotationDocumentRead";
import type { Body_user_login } from "../models/Body_user_login";
import type { CodeRead } from "../models/CodeRead";
import type { MemoRead } from "../models/MemoRead";
import type { ProjectRead } from "../models/ProjectRead";
import type { UserAuthorizationHeaderData } from "../models/UserAuthorizationHeaderData";
import type { UserCreate } from "../models/UserCreate";
import type { UserRead } from "../models/UserRead";
import type { UserUpdate } from "../models/UserUpdate";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class UserService {
  /**
   * Returns all Users
   * Returns all Users that exist in the system
   * @returns UserRead Successful Response
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
  }): CancelablePromise<Array<UserRead>> {
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
   * Registers a new User
   * Registers a new User and returns it with the generated ID.
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static register({ requestBody }: { requestBody: UserCreate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/user",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the JWT access token for the provided user login data
   * Returns the JWT access token for the provided user login data if the login was successful. This is usually only called from an OAuth2 client!
   * @returns UserAuthorizationHeaderData Successful Response
   * @throws ApiError
   */
  public static login({ formData }: { formData: Body_user_login }): CancelablePromise<UserAuthorizationHeaderData> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/user/login",
      formData: formData,
      mediaType: "application/x-www-form-urlencoded",
      errors: {
        422: `Validation Error`,
      },
    });
  }

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
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getById({ userId }: { userId: number }): CancelablePromise<UserRead> {
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
   * Removes all Codes of the User
   * Removes all Codes of the User with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteUserCodes({ userId }: { userId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
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
   * Removes all Memos of the User
   * Removes all Memos of the User with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteUserMemos({ userId }: { userId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
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
   * @returns number Successful Response
   * @throws ApiError
   */
  public static recentActivity({ userId, k }: { userId: number; k: number }): CancelablePromise<Array<number>> {
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
