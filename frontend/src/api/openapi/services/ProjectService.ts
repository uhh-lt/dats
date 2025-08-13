/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_project_upload_project_sdoc } from "../models/Body_project_upload_project_sdoc";
import type { ProjectCreate } from "../models/ProjectCreate";
import type { ProjectRead } from "../models/ProjectRead";
import type { ProjectUpdate } from "../models/ProjectUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectService {
  /**
   * Creates a new Project
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static createNewProject({ requestBody }: { requestBody: ProjectCreate }): CancelablePromise<ProjectRead> {
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
  public static readProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
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
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: ProjectUpdate;
  }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
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
  public static deleteProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Uploads one or multiple SourceDocument to the Project with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static uploadProjectSdoc({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_project_upload_project_sdoc;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project/{proj_id}/sdoc",
      path: {
        proj_id: projId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
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
    projId,
    filename,
    onlyFinished = true,
  }: {
    projId: number;
    filename: string;
    onlyFinished?: boolean;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/resolve_filename/{filename}",
      path: {
        proj_id: projId,
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
}
