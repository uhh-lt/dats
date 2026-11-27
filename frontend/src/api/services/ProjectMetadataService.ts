/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectMetadataCreate } from "@models/ProjectMetadataCreate";
import type { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import type { ProjectMetadataUpdate } from "@models/ProjectMetadataUpdate";
import type { ProjectMetadataUpdateBulk } from "@models/ProjectMetadataUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectMetadataService {
  /**
   * Creates a new Metadata and returns it with the generated ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ProjectMetadataCreate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/project-metadata",
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
   * Returns all ProjectMetadata of the Project
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ProjectMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/project-metadata",
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
   * Returns the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    projectMetadataId,
  }: {
    projectId: number;
    projectMetadataId: number;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/project-metadata/{project_metadata_id}",
      path: {
        project_id: projectId,
        project_metadata_id: projectMetadataId,
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
   * Updates the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    projectMetadataId,
    requestBody,
  }: {
    projectId: number;
    projectMetadataId: number;
    requestBody: ProjectMetadataUpdate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/project-metadata/{project_metadata_id}",
      path: {
        project_id: projectId,
        project_metadata_id: projectMetadataId,
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
   * Deletes the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    projectMetadataId,
  }: {
    projectId: number;
    projectMetadataId: number;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/project-metadata/{project_metadata_id}",
      path: {
        project_id: projectId,
        project_metadata_id: projectMetadataId,
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
   * Updates the Metadata with the given IDs.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<ProjectMetadataUpdateBulk>;
  }): CancelablePromise<Array<ProjectMetadataRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/project-metadata/bulk",
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
