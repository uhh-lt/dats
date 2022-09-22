/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDocumentRead } from "../models/AnnotationDocumentRead";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { SourceDocumentContent } from "../models/SourceDocumentContent";
import type { SourceDocumentKeywords } from "../models/SourceDocumentKeywords";
import type { SourceDocumentMetadataRead } from "../models/SourceDocumentMetadataRead";
import type { SourceDocumentMetadataUpdate } from "../models/SourceDocumentMetadataUpdate";
import type { SourceDocumentRead } from "../models/SourceDocumentRead";
import type { SourceDocumentTokens } from "../models/SourceDocumentTokens";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class SourceDocumentService {
  /**
   * Returns the SourceDocument
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getByIdSdocSdocIdGet({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
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
   * Removes the SourceDocument
   * Removes the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteByIdSdocSdocIdDelete({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
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
   * Returns the (textual) content of the SourceDocument
   * Returns the (textual) content of the SourceDocument if it exists. If the SourceDocument is not a text file, there is no content but an URL to the file content.
   * @returns SourceDocumentContent Successful Response
   * @throws ApiError
   */
  public static getContentSdocSdocIdContentGet({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<SourceDocumentContent> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/content",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the textual tokens of the SourceDocument if it is a text document.
   * Returns the textual tokens of the SourceDocument if it is a text document.
   * @returns SourceDocumentTokens Successful Response
   * @throws ApiError
   */
  public static getTokensSdocSdocIdTokensGet({
    sdocId,
    characterOffsets = false,
  }: {
    sdocId: number;
    /**
     * If True include the character offsets.
     */
    characterOffsets?: boolean;
  }): CancelablePromise<SourceDocumentTokens> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/tokens",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        character_offsets: characterOffsets,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the keywords of the SourceDocument if it is a text document.
   * Returns the keywords of the SourceDocument if it is a text document.
   * @returns SourceDocumentKeywords Successful Response
   * @throws ApiError
   */
  public static getTokensSdocSdocIdKeywordsGet({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<SourceDocumentKeywords> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/keywords",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the keywords of the SourceDocument.
   * Updates the keywords of the SourceDocument.
   * @returns SourceDocumentKeywords Successful Response
   * @throws ApiError
   */
  public static updateKeywordsSdocSdocIdKeywordsPatch({
    requestBody,
  }: {
    requestBody: SourceDocumentKeywords;
  }): CancelablePromise<SourceDocumentKeywords> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}/keywords",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the URL to the original file of the SourceDocument
   * Returns the URL to the original file of the SourceDocument with the given ID if it exists.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getFileUrlSdocSdocIdUrlGet({
    sdocId,
    relative = true,
  }: {
    sdocId: number;
    relative?: boolean;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/url",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        relative: relative,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SourceDocumentMetadata
   * Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getAllMetadataSdocSdocIdMetadataGet({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
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
   * Returns the SourceDocumentMetadata with the given Key
   * Returns the SourceDocumentMetadata with the given Key if it exists.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static readMetadataByKeySdocSdocIdMetadataMetadataKeyGet({
    sdocId,
    metadataKey,
  }: {
    sdocId: number;
    metadataKey: string;
  }): CancelablePromise<SourceDocumentMetadataRead> {
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
   * Updates the SourceDocumentMetadata
   * Updates the SourceDocumentMetadata with the given ID if it exists.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateMetadataByIdSdocSdocIdMetadataMetadataIdPatch({
    sdocId,
    metadataId,
    requestBody,
  }: {
    sdocId: number;
    metadataId: number;
    requestBody: SourceDocumentMetadataUpdate;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}/metadata/{metadata_id}",
      path: {
        sdoc_id: sdocId,
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
   * Returns the AnnotationDocument for the SourceDocument of the User
   * Returns the AnnotationDocument for the SourceDocument of the User.
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getAdocOfUserSdocSdocIdAdocUserIdGet({
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
   * Returns all AnnotationDocuments for the SourceDocument
   * Returns all AnnotationDocuments for the SourceDocument.
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getAllAdocsSdocSdocIdAdocGet({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<Array<AnnotationDocumentRead>> {
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
   * Removes all AnnotationDocuments for the SourceDocument
   * Removes all AnnotationDocuments for the SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static removeAllAdocsSdocSdocIdAdocDelete({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
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
   * Returns all DocumentTags linked with the SourceDocument
   * Returns all DocumentTags linked with the SourceDocument.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static getAllTagsSdocSdocIdTagsGet({ sdocId }: { sdocId: number }): CancelablePromise<Array<DocumentTagRead>> {
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
   * Unlinks all DocumentTags with the SourceDocument
   * Unlinks all DocumentTags of the SourceDocument.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static unlinksAllTagsSdocSdocIdTagsDelete({
    sdocId,
  }: {
    sdocId: number;
  }): CancelablePromise<SourceDocumentRead> {
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
   * Unlinks the DocumentTag from the SourceDocument
   * Unlinks the DocumentTags from the SourceDocument.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static unlinkTagSdocSdocIdTagTagIdDelete({
    sdocId,
    tagId,
  }: {
    sdocId: number;
    tagId: number;
  }): CancelablePromise<SourceDocumentRead> {
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
   * Links a DocumentTag with the SourceDocument
   * Links a DocumentTag with the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static linkTagSdocSdocIdTagTagIdPatch({
    sdocId,
    tagId,
  }: {
    sdocId: number;
    tagId: number;
  }): CancelablePromise<SourceDocumentRead> {
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
   * Returns all Memo attached to the SourceDocument
   * Returns all Memo attached to the SourceDocument with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemosSdocSdocIdMemoGet({ sdocId }: { sdocId: number }): CancelablePromise<Array<MemoRead>> {
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
   * Adds a Memo to the SourceDocument
   * Adds a Memo to the SourceDocument with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemoSdocSdocIdMemoPut({
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
   * Returns the Memo attached to the SourceDocument of the User with the given ID
   * Returns the Memo attached to the SourceDocument with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemoSdocSdocIdMemoUserIdGet({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<MemoRead> {
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
   * Returns the Memo attached to the SourceDocument of the User with the given ID and all memos attached to its annotations.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getRelatedUserMemosSdocSdocIdRelatedmemosUserIdGet({
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
}
