/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { BBoxAnnotationReadResolved } from "../models/BBoxAnnotationReadResolved";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { SourceDocumentMetadataReadResolved } from "../models/SourceDocumentMetadataReadResolved";
import type { SourceDocumentRead } from "../models/SourceDocumentRead";
import type { SourceDocumentUpdate } from "../models/SourceDocumentUpdate";
import type { SourceDocumentWithDataRead } from "../models/SourceDocumentWithDataRead";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanAnnotationReadResolved } from "../models/SpanAnnotationReadResolved";
import type { SpanGroupRead } from "../models/SpanGroupRead";
import type { WordFrequencyRead } from "../models/WordFrequencyRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SourceDocumentService {
  /**
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentWithDataRead Successful Response
   * @throws ApiError
   */
  public static getById({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentWithDataRead> {
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
   * Updates the SourceDocument with the given ID.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static updateSdoc({
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
   * Returns the ids of SourceDocuments linked to the SourceDocument with the given id.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getLinkedSdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/linked_sdocs",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the URL to the original file of the SourceDocument with the given ID if it exists.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getFileUrl({
    sdocId,
    relative = true,
    webp = false,
    thumbnail = false,
  }: {
    sdocId: number;
    relative?: boolean;
    webp?: boolean;
    thumbnail?: boolean;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/url",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        relative: relative,
        webp: webp,
        thumbnail: thumbnail,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists
   * @returns SourceDocumentMetadataReadResolved Successful Response
   * @throws ApiError
   */
  public static getAllMetadata({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<Array<SourceDocumentMetadataReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/metadata",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentMetadata with the given Key if it exists.
   * @returns SourceDocumentMetadataReadResolved Successful Response
   * @throws ApiError
   */
  public static readMetadataByKey({
    sdocId,
    metadataKey,
  }: {
    sdocId: number;
    metadataKey: string;
  }): CancelablePromise<SourceDocumentMetadataReadResolved> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/metadata/{metadata_key}",
      path: {
        sdoc_id: sdocId,
        metadata_key: metadataKey,
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
   * Returns all DocumentTags linked with the SourceDocument.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static getAllTags({ sdocId }: { sdocId: number }): CancelablePromise<Array<DocumentTagRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/tags",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Adds a Memo to the SourceDocument with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    sdocId,
    requestBody,
  }: {
    sdocId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sdoc/{sdoc_id}/memo",
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
   * Returns all Memo attached to the SourceDocument with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ sdocId }: { sdocId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/memo",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo attached to the SourceDocument with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemo({ sdocId, userId }: { sdocId: number; userId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/memo/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo attached to the SourceDocument of the User with the given ID and all memos attached to its annotations.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getRelatedUserMemos({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/relatedmemos/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocument's word frequencies with the given ID if it exists
   * @returns WordFrequencyRead Successful Response
   * @throws ApiError
   */
  public static getWordFrequencies({ sdocId }: { sdocId: number }): CancelablePromise<Array<WordFrequencyRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/word_frequencies",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanAnnotations of the User with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllSpanAnnotations({
    sdocId,
    userId,
    resolve = true,
  }: {
    sdocId: number;
    userId: number;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<SpanAnnotationRead> | Array<SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/user/{user_id}/span_annotations",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      query: {
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanAnnotations of the Users with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllSpanAnnotationsBulk({
    sdocId,
    userId,
    resolve = true,
  }: {
    sdocId: number;
    userId: Array<number>;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<SpanAnnotationRead> | Array<SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/span_annotations/bulk",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        user_id: userId,
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all BBoxAnnotations of the User with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllBboxAnnotations({
    sdocId,
    userId,
    skip,
    limit,
    resolve = true,
  }: {
    sdocId: number;
    userId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<BBoxAnnotationRead> | Array<BBoxAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc{sdoc_id}/user/{user_id}/bbox_annotations",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      query: {
        skip: skip,
        limit: limit,
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all BBoxAnnotations of the Users with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllBboxAnnotationsBulk({
    sdocId,
    userId,
    skip,
    limit,
    resolve = true,
  }: {
    sdocId: number;
    userId: Array<number>;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<BBoxAnnotationRead> | Array<BBoxAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc{sdoc_id}/bbox_annotations/bulk",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        user_id: userId,
        skip: skip,
        limit: limit,
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanGroups of the User with the given ID if it exists
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllSpanGroups({
    sdocId,
    userId,
    skip,
    limit,
  }: {
    sdocId: number;
    userId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc{sdoc_id}/user/{user_id}/span_groups",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
