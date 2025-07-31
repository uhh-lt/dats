/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FolderCreate } from "../models/FolderCreate";
import type { FolderRead } from "../models/FolderRead";
import type { FolderTreeRead } from "../models/FolderTreeRead";
import type { FolderType } from "../models/FolderType";
import type { FolderUpdate } from "../models/FolderUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FolderService {
  /**
   * Get Folder By Id
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getFolderById({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
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
   * Update Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static updateFolder({
    folderId,
    requestBody,
  }: {
    folderId: number;
    requestBody: FolderUpdate;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PUT",
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
   * Delete Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static deleteFolder({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
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
   * Get Tree By Id
   * @returns FolderTreeRead Successful Response
   * @throws ApiError
   */
  public static getTreeById({ folderId }: { folderId: number }): CancelablePromise<FolderTreeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/tree/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the folder tree of the project with the given ID
   * @returns FolderTreeRead Successful Response
   * @throws ApiError
   */
  public static getTreeByProject({ projectId }: { projectId: number }): CancelablePromise<Array<FolderTreeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/project/{project_id}/tree",
      path: {
        project_id: projectId,
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
   * Create Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static createFolder({ requestBody }: { requestBody: FolderCreate }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/folder/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Subfolders
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getSubfolders({ folderId }: { folderId: number }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/subfolders/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
