/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectCreate } from "@models/ProjectCreate";
import type { ProjectRead } from "@models/ProjectRead";
import type { ProjectUpdate } from "@models/ProjectUpdate";
import type { SDocStatus } from "@models/SDocStatus";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectService {
  /**
   * Creates a new Project
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static createProject({ requestBody }: { requestBody: ProjectCreate }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Project with the given ID if it exists
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getProject({ projectId }: { projectId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static updateProject({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ProjectUpdate;
  }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{project_id}",
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
   * Removes the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static deleteProject({ projectId }: { projectId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Id of the SourceDocument identified by project_id and filename if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static resolveFilename({
    projectId,
    filename,
    onlyFinished = true,
  }: {
    projectId: number;
    filename: string;
    onlyFinished?: boolean;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{project_id}/resolve_filename/{filename}",
      path: {
        project_id: projectId,
        filename: filename,
      },
      query: {
        only_finished: onlyFinished,
      },
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
      url: "/project/user/projects",
    });
  }
  /**
   * Returns count of SourceDocuments with the given status in the given project.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countSdocsWithStatus({
    projectId,
    status,
  }: {
    projectId: number;
    status: SDocStatus;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{project_id}/sdoc/status/{status}",
      path: {
        project_id: projectId,
        status: status,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
