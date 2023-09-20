/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WhiteboardCreate } from "../models/WhiteboardCreate";
import type { WhiteboardRead } from "../models/WhiteboardRead";
import type { WhiteboardUpdate } from "../models/WhiteboardUpdate";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class WhiteboardService {
  /**
   * Creates an Whiteboard
   * Creates an Whiteboard
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: WhiteboardCreate }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/whiteboard",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Whiteboard
   * Returns the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static getById({ whiteboardId }: { whiteboardId: number }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/whiteboard/{whiteboard_id}",
      path: {
        whiteboard_id: whiteboardId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the Whiteboard
   * Removes the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ whiteboardId }: { whiteboardId: number }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/whiteboard/{whiteboard_id}",
      path: {
        whiteboard_id: whiteboardId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the Whiteboard
   * Updates the Whiteboard with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    whiteboardId,
    requestBody,
  }: {
    whiteboardId: number;
    requestBody: WhiteboardUpdate;
  }): CancelablePromise<WhiteboardRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/whiteboard/{whiteboard_id}",
      path: {
        whiteboard_id: whiteboardId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns Whiteboards of the Project of the User
   * Returns the Whiteboard of the Project with the given ID and the User with the given ID if it exists
   * @returns WhiteboardRead Successful Response
   * @throws ApiError
   */
  public static getByProjectAndUser({
    projectId,
    userId,
  }: {
    projectId: number;
    userId: number;
  }): CancelablePromise<Array<WhiteboardRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/whiteboard/project/{project_id}/user/{user_id}",
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
