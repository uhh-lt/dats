/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WhiteboardCreate } from "@models/WhiteboardCreate";
import type { WhiteboardData } from "@models/WhiteboardData";
import type { WhiteboardRead } from "@models/WhiteboardRead";
import type { WhiteboardUpdate } from "@models/WhiteboardUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class WhiteboardsService {
  /**
   * Creates an Whiteboard
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: WhiteboardCreate;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/whiteboards",
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
   * Returns the Whiteboards of the Project
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<WhiteboardRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/whiteboards",
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
   * Duplicates the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static duplicate({
    projectId,
    whiteboardId,
  }: {
    projectId: number;
    whiteboardId: number;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/whiteboards/{whiteboard_id}/duplicate",
      path: {
        project_id: projectId,
        whiteboard_id: whiteboardId,
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
   * Returns the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    whiteboardId,
  }: {
    projectId: number;
    whiteboardId: number;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/whiteboards/{whiteboard_id}",
      path: {
        project_id: projectId,
        whiteboard_id: whiteboardId,
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
   * Updates the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    whiteboardId,
    requestBody,
  }: {
    projectId: number;
    whiteboardId: number;
    requestBody: WhiteboardUpdate;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/whiteboards/{whiteboard_id}",
      path: {
        project_id: projectId,
        whiteboard_id: whiteboardId,
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
   * Removes the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    whiteboardId,
  }: {
    projectId: number;
    whiteboardId: number;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/whiteboards/{whiteboard_id}",
      path: {
        project_id: projectId,
        whiteboard_id: whiteboardId,
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
   * Returns the data of the objects on the Whiteboard with the given ID
   * @returns WhiteboardData Successful Response
   * @throws ApiError
   */
  public static getData({
    projectId,
    whiteboardId,
  }: {
    projectId: number;
    whiteboardId: number;
  }): CancelablePromise<WhiteboardData> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/whiteboards/{whiteboard_id}/data",
      path: {
        project_id: projectId,
        whiteboard_id: whiteboardId,
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
