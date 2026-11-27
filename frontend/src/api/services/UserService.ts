/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectAddUser } from "@models/ProjectAddUser";
import type { ProjectRead } from "@models/ProjectRead";
import type { ProjectUserLinks } from "@models/ProjectUserLinks";
import type { UserRead } from "@models/UserRead";
import type { UserUpdate } from "@models/UserUpdate";
import type { VirtualUserCreate } from "@models/VirtualUserCreate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class UserService {
  /**
   * Returns the current (logged in) user
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/users/me",
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
      url: "/users/me",
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
      url: "/users/me",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Projects of the logged-in User
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getUserProjects(): CancelablePromise<Array<ProjectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/users/me/projects",
    });
  }
  /**
   * Creates a virtual user (a user that cannot log in) in the Project
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static createVirtualUser({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: VirtualUserCreate;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/virtual-users",
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
   * Returns all Users of the Project with the given ID: its members, then its virtual users
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/members",
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
   * Adds the existing User with the given email to the Project as a member
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
      method: "PUT",
      url: "/projects/{project_id}/members",
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
   * Updates the virtual user with the given ID of the Project
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateVirtualUser({
    projectId,
    virtualUserId,
    requestBody,
  }: {
    projectId: number;
    virtualUserId: number;
    requestBody: UserUpdate;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/virtual-users/{virtual_user_id}",
      path: {
        project_id: projectId,
        virtual_user_id: virtualUserId,
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
   * Removes the virtual user with the given ID of the Project together with all its annotations and memos. The virtual user of an experiment run cannot be deleted here (HTTP 409); delete its run in the Experiment Studio.
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteVirtualUser({
    projectId,
    virtualUserId,
  }: {
    projectId: number;
    virtualUserId: number;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/virtual-users/{virtual_user_id}",
      path: {
        project_id: projectId,
        virtual_user_id: virtualUserId,
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
   * Removes the member with the given ID from the Project
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
      url: "/projects/{project_id}/members/{user_id}",
      path: {
        project_id: projectId,
        user_id: userId,
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
