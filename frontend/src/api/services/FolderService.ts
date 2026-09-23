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
  public static createFolder({ requestBody }: { requestBody: FolderCreate }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/folder",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Folder with the given ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getById({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
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
    folderId,
    requestBody,
  }: {
    folderId: number;
    requestBody: FolderUpdate;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Folder with the given ID.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
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
    folderId,
  }: {
    folderId: number;
  }): CancelablePromise<Record<string, Array<number>>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/sdocids/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the folders of the folder_type of the project with the given ID
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getFoldersByProjectAndType({
    projectId,
    folderType,
  }: {
    projectId: number;
    folderType: FolderType;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/project/{project_id}/folder/{folder_type}",
      path: {
        project_id: projectId,
        folder_type: folderType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Folders with the given IDs.
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static updateFoldersBulk({
    requestBody,
  }: {
    requestBody: Array<FolderUpdateBulk>;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/folder/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
