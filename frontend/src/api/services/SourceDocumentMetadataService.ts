/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import type { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import type { SourceDocumentMetadataUpdateBulk } from "@models/SourceDocumentMetadataUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SourceDocumentMetadataService {
  /**
   * Returns the SourceDocumentMetadata of the SourceDocument, optionally only the one with the given key
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getBySdoc({
    projectId,
    sdocId,
    key,
  }: {
    projectId: number;
    sdocId: number;
    key?: string | null;
  }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-document-metadata",
      path: {
        project_id: projectId,
      },
      query: {
        sdoc_id: sdocId,
        key: key,
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
   * Returns the SourceDocumentMetadata with the given ID if it exists
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    sdocMetadataId,
  }: {
    projectId: number;
    sdocMetadataId: number;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-document-metadata/{sdoc_metadata_id}",
      path: {
        project_id: projectId,
        sdoc_metadata_id: sdocMetadataId,
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
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    sdocMetadataId,
    requestBody,
  }: {
    projectId: number;
    sdocMetadataId: number;
    requestBody: SourceDocumentMetadataUpdate;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/source-document-metadata/{sdoc_metadata_id}",
      path: {
        project_id: projectId,
        sdoc_metadata_id: sdocMetadataId,
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
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    sdocMetadataId,
  }: {
    projectId: number;
    sdocMetadataId: number;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/source-document-metadata/{sdoc_metadata_id}",
      path: {
        project_id: projectId,
        sdoc_metadata_id: sdocMetadataId,
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
   * Updates multiple metadata objects at once.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<SourceDocumentMetadataUpdateBulk>;
  }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/source-document-metadata/bulk",
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
