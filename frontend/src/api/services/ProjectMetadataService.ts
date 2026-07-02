/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectMetadataCreate } from "../models/ProjectMetadataCreate";
import type { ProjectMetadataRead } from "../models/ProjectMetadataRead";
import type { ProjectMetadataUpdate } from "../models/ProjectMetadataUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectMetadataService {
  /**
   * Creates a new Metadata and returns it with the generated ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static createNewMetadata({
    requestBody,
  }: {
    requestBody: ProjectMetadataCreate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projmeta",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById({ metadataId }: { metadataId: number }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    metadataId,
    requestBody,
  }: {
    metadataId: number;
    requestBody: ProjectMetadataUpdate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ metadataId }: { metadataId: number }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all ProjectMetadata of the Project with the given ID if it exists
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projId }: { projId: number }): CancelablePromise<Array<ProjectMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projmeta/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
