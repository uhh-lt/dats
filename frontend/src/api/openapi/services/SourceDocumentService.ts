/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDocumentRead } from "../models/AnnotationDocumentRead";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { SourceDocumentMetadataReadResolved } from "../models/SourceDocumentMetadataReadResolved";
import type { SourceDocumentRead } from "../models/SourceDocumentRead";
import type { SourceDocumentUpdate } from "../models/SourceDocumentUpdate";
import type { SourceDocumentWithDataRead } from "../models/SourceDocumentWithDataRead";
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
   * Returns the AnnotationDocument for the SourceDocument of the User or create the AnnotationDocument for the User if it does not exist.
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getAdocOfUser({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<AnnotationDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/adoc/{user_id}",
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
   * Returns all AnnotationDocuments for the SourceDocument.
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getAllAdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<AnnotationDocumentRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/adoc",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all AnnotationDocuments for the SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static removeAllAdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/{sdoc_id}/adoc",
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
   * Unlinks all DocumentTags of the SourceDocument.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static unlinksAllTags({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
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
   * Links a DocumentTag with the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static linkTag({ sdocId, tagId }: { sdocId: number; tagId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}/tag/{tag_id}",
      path: {
        sdoc_id: sdocId,
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Unlinks the DocumentTags from the SourceDocument.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static unlinkTag({ sdocId, tagId }: { sdocId: number; tagId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/{sdoc_id}/tag/{tag_id}",
      path: {
        sdoc_id: sdocId,
        tag_id: tagId,
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
}
