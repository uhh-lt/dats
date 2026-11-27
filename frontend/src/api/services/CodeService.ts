/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeCreate } from "@models/CodeCreate";
import type { CodeRead } from "@models/CodeRead";
import type { CodeUpdate } from "@models/CodeUpdate";
import type { CodeUpdateBulk } from "@models/CodeUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodeService {
  /**
   * Creates a new Code and returns it with the generated ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: CodeCreate;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/codes",
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
   * Returns all Codes of the Project
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/codes",
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
   * Returns the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getById({ projectId, codeId }: { projectId: number; codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/codes/{code_id}",
      path: {
        project_id: projectId,
        code_id: codeId,
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
   * Updates the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    codeId,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    requestBody: CodeUpdate;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/codes/{code_id}",
      path: {
        project_id: projectId,
        code_id: codeId,
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
   * Deletes the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ projectId, codeId }: { projectId: number; codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/codes/{code_id}",
      path: {
        project_id: projectId,
        code_id: codeId,
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
   * Updates the Codes with the given IDs.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<CodeUpdateBulk>;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/codes/bulk",
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
