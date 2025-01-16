/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "../models/CodeRead";
import type { MemoRead } from "../models/MemoRead";
import type { SentenceAnnotationCreate } from "../models/SentenceAnnotationCreate";
import type { SentenceAnnotationRead } from "../models/SentenceAnnotationRead";
import type { SentenceAnnotationReadResolved } from "../models/SentenceAnnotationReadResolved";
import type { SentenceAnnotationUpdate } from "../models/SentenceAnnotationUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SentenceAnnotationService {
  /**
   * Creates a SentenceAnnotation
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotation({
    requestBody,
    resolve = true,
  }: {
    requestBody: SentenceAnnotationCreate;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SentenceAnnotationRead | SentenceAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence",
      query: {
        resolve: resolve,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SentenceAnnotations in Bulk
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotationsBulk({
    requestBody,
    resolve = true,
  }: {
    requestBody: Array<SentenceAnnotationCreate>;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<SentenceAnnotationRead> | Array<SentenceAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence/bulk/create",
      query: {
        resolve: resolve,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SentenceAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getById({
    sentenceAnnoId,
    resolve = true,
  }: {
    sentenceAnnoId: number;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SentenceAnnotationRead | SentenceAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
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
   * Updates the SentenceAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    sentenceAnnoId,
    requestBody,
    resolve = true,
  }: {
    sentenceAnnoId: number;
    requestBody: SentenceAnnotationUpdate;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SentenceAnnotationRead | SentenceAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      query: {
        resolve: resolve,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the SentenceAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({
    sentenceAnnoId,
  }: {
    sentenceAnnoId: number;
  }): CancelablePromise<SentenceAnnotationRead | SentenceAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all SentenceAnnotations with the given IDs.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulkById({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Code of the SentenceAnnotation with the given ID if it exists.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCode({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}/code",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memos attached to the SentenceAnnotation with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}/memo",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo attached to the SentenceAnnotation with the given ID of the logged-in User if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemo({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}/memo/user",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SentenceAnnotations with the given Code of the logged-in User
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
