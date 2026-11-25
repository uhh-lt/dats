/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DateMetadataCountResult } from "@models/DateMetadataCountResult";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import type { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import type { SourceDocumentMetadataUpdateBulk } from "@models/SourceDocumentMetadataUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SdocMetadataService {
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
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the number of SourceDocuments with a value for the date metadata and of all SourceDocuments of the Project.
   * @returns DateMetadataCountResult Successful Response
   * @throws ApiError
   */
  public static countSdocsWithDateMetadata({
    projectId,
    dateMetadataId,
  }: {
    projectId: number;
    dateMetadataId: number;
  }): CancelablePromise<DateMetadataCountResult> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-document-metadata/date-count",
      path: {
        project_id: projectId,
      },
      query: {
        date_metadata_id: dateMetadataId,
      },
      errors: {
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
        422: `Validation Error`,
      },
    });
  }
}
