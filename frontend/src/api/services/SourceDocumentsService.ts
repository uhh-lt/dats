/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SDocStatus } from "@models/SDocStatus";
import type { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import type { SourceDocumentRead } from "@models/SourceDocumentRead";
import type { SourceDocumentUpdate } from "@models/SourceDocumentUpdate";
import type { SourceDocumentUrls } from "@models/SourceDocumentUrls";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SourceDocumentsService {
  /**
   * Returns the number of SourceDocuments of the Project, optionally only those with the given status or with a value for the given date metadata
   * @returns number Successful Response
   * @throws ApiError
   */
  public static count({
    projectId,
    status,
    dateMetadataId,
  }: {
    projectId: number;
    status?: SDocStatus | null;
    dateMetadataId?: number | null;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/count",
      path: {
        project_id: projectId,
      },
      query: {
        status: status,
        date_metadata_id: dateMetadataId,
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
   * Returns the SourceDocument of the Project with the given filename: a list of one, or an empty list
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    filename,
    onlyFinished = true,
  }: {
    projectId: number;
    filename: string;
    onlyFinished?: boolean;
  }): CancelablePromise<Array<SourceDocumentRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents",
      path: {
        project_id: projectId,
      },
      query: {
        filename: filename,
        only_finished: onlyFinished,
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
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    sdocId,
    onlyIfFinished = false,
  }: {
    projectId: number;
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/{sdoc_id}",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
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
   * Updates the SourceDocument with the given ID.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    sdocId,
    requestBody,
  }: {
    projectId: number;
    sdocId: number;
    requestBody: SourceDocumentUpdate;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/source-documents/{sdoc_id}",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
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
   * Removes the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    sdocId,
  }: {
    projectId: number;
    sdocId: number;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/source-documents/{sdoc_id}",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
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
   * Returns the SourceDocumentData of the SourceDocument with the given ID if it exists
   * @returns SourceDocumentDataRead Successful Response
   * @throws ApiError
   */
  public static getByIdWithData({
    projectId,
    sdocId,
    onlyIfFinished = false,
  }: {
    projectId: number;
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentDataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/{sdoc_id}/data",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
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
   * Returns the ids of SourceDocuments in the same folder as the SourceDocument with the given id.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSiblings({
    projectId,
    sdocId,
  }: {
    projectId: number;
    sdocId: number;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/{sdoc_id}/siblings",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
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
   * Returns the URLs of the files of the SourceDocument with the given ID (relative to /content/).
   * @returns SourceDocumentUrls Successful Response
   * @throws ApiError
   */
  public static getUrls({
    projectId,
    sdocId,
  }: {
    projectId: number;
    sdocId: number;
  }): CancelablePromise<SourceDocumentUrls> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/{sdoc_id}/urls",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
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
   * Returns IDs of users that annotated that SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAnnotators({
    projectId,
    sdocId,
  }: {
    projectId: number;
    sdocId: number;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/source-documents/{sdoc_id}/annotators",
      path: {
        project_id: projectId,
        sdoc_id: sdocId,
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
   * Removes all SourceDocuments with the given IDs if they exist
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<SourceDocumentRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/source-documents/bulk",
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
