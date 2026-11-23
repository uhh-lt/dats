/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import type { SourceDocumentRead } from "@models/SourceDocumentRead";
import type { SourceDocumentUpdate } from "@models/SourceDocumentUpdate";
import type { SourceDocumentUrls } from "@models/SourceDocumentUrls";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SourceDocumentService {
  /**
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getById({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
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
    sdocId,
    requestBody,
  }: {
    sdocId: number;
    requestBody: SourceDocumentUpdate;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentData with the given ID if it exists
   * @returns SourceDocumentDataRead Successful Response
   * @throws ApiError
   */
  public static getByIdWithData({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentDataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/data/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ids of SourceDocuments in the same folder as the SourceDocument with the given id.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSameFolderSdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/same_folder",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the URLs of the files of the SourceDocument with the given ID (relative to /content/).
   * @returns SourceDocumentUrls Successful Response
   * @throws ApiError
   */
  public static getUrls({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentUrls> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/urls",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns IDs of users that annotated that SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAnnotators({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/annotators",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes all SourceDocuments with the given IDs if they exist
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteSdocsBulk({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SourceDocumentRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
