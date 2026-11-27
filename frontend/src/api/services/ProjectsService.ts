/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectCreate } from "@models/ProjectCreate";
import type { ProjectRead } from "@models/ProjectRead";
import type { ProjectUpdate } from "@models/ProjectUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectsService {
  /**
   * Returns the Project with the given ID if it exists
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getById({ projectId }: { projectId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}",
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
   * Updates the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ProjectUpdate;
  }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}",
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
   * Removes the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ projectId }: { projectId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}",
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
   * Creates a new Project
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: ProjectCreate }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
