/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectAddUser } from "@models/ProjectAddUser";
import type { ProjectUserLinks } from "@models/ProjectUserLinks";
import type { PublicUserRead } from "@models/PublicUserRead";
import type { UserRead } from "@models/UserRead";
import type { UserUpdate } from "@models/UserUpdate";
import type { VirtualAnnotatorCreate } from "@models/VirtualAnnotatorCreate";
import type { VirtualAnnotatorUpdate } from "@models/VirtualAnnotatorUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class UserService {
  /**
   * Creates a virtual annotator (a user without login) in the Project
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static createVirtualAnnotator({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: VirtualAnnotatorCreate;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/user/{project_id}/virtual_annotator",
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
   * Returns the virtual annotators of the Project with the given ID
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getVirtualAnnotatorsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{project_id}/virtual_annotator",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
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
   * Returns the User with the given ID if it exists
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getById({ userId }: { userId: number }): CancelablePromise<PublicUserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/by_id/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Users of the Project with the given ID
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{project_id}/user",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Associates an existing User to the Project with the given ID if it exists
   * @returns ProjectUserLinks Successful Response
   * @throws ApiError
   */
  public static associateUserToProject({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ProjectAddUser;
  }): CancelablePromise<ProjectUserLinks> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/{project_id}/user",
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
   * Returns all annotators of the Project with the given ID: its members, followed by its virtual annotators
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getAnnotatorsByProject({ projectId }: { projectId: number }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{project_id}/annotator",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all human Users that exist in the system (virtual annotators belong to their project)
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
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<PublicUserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/all",
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
   * Removes the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/",
    });
  }
  /**
   * Updates the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateMe({ requestBody }: { requestBody: UserUpdate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Renames the virtual annotator with the given ID
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateVirtualAnnotator({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: VirtualAnnotatorUpdate;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/virtual_annotator/{user_id}",
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
   * Removes the virtual annotator with the given ID together with all its annotations and memos
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteVirtualAnnotator({ userId }: { userId: number }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/virtual_annotator/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Dissociates the Users with the Project with the given ID if it exists
   * @returns ProjectUserLinks Successful Response
   * @throws ApiError
   */
  public static dissociateUserFromProject({
    projectId,
    userId,
  }: {
    projectId: number;
    userId: number;
  }): CancelablePromise<ProjectUserLinks> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/{project_id}/user/{user_id}",
      path: {
        project_id: projectId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
