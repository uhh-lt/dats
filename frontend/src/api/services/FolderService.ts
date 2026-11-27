/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FolderCreate } from "@models/FolderCreate";
import type { FolderRead } from "@models/FolderRead";
import type { FolderType } from "@models/FolderType";
import type { FolderUpdate } from "@models/FolderUpdate";
import type { FolderUpdateBulk } from "@models/FolderUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FolderService {
  /**
   * Creates a new Folder and returns it with the generated ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: FolderCreate;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/folders",
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
   * Returns the folders of the project, optionally only those of the folder_type
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    folderType,
  }: {
    projectId: number;
    folderType?: FolderType | null;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/folders",
      path: {
        project_id: projectId,
      },
      query: {
        folder_type: folderType,
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
   * Returns the Folder with the given ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    folderId,
  }: {
    projectId: number;
    folderId: number;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/folders/{folder_id}",
      path: {
        project_id: projectId,
        folder_id: folderId,
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
   * Updates the Folder with the given ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    folderId,
    requestBody,
  }: {
    projectId: number;
    folderId: number;
    requestBody: FolderUpdate;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/folders/{folder_id}",
      path: {
        project_id: projectId,
        folder_id: folderId,
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
   * Deletes the Folder with the given ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    folderId,
  }: {
    projectId: number;
    folderId: number;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/folders/{folder_id}",
      path: {
        project_id: projectId,
        folder_id: folderId,
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
   * Returns lists of source document ids per doctype in the specified sdoc folder
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocIdsInFolderByDoctype({
    projectId,
    folderId,
  }: {
    projectId: number;
    folderId: number;
  }): CancelablePromise<Record<string, Array<number>>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/folders/{folder_id}/source-documents",
      path: {
        project_id: projectId,
        folder_id: folderId,
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
   * Updates the Folders with the given IDs.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<FolderUpdateBulk>;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/folders/bulk",
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
