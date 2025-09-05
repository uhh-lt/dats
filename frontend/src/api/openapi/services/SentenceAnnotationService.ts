/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_sentenceAnnotation_count_annotations } from "../models/Body_sentenceAnnotation_count_annotations";
import type { SentenceAnnotationCreate } from "../models/SentenceAnnotationCreate";
import type { SentenceAnnotationRead } from "../models/SentenceAnnotationRead";
import type { SentenceAnnotationUpdate } from "../models/SentenceAnnotationUpdate";
import type { SentenceAnnotationUpdateBulk } from "../models/SentenceAnnotationUpdateBulk";
import type { SentenceAnnotatorResult } from "../models/SentenceAnnotatorResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SentenceAnnotationService {
  /**
   * Creates a SentenceAnnotation
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotation({
    requestBody,
  }: {
    requestBody: SentenceAnnotationCreate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SentenceAnnotations in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationCreate>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence/bulk/create",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
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
   * Updates the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    sentenceAnnoId,
    requestBody,
  }: {
    sentenceAnnoId: number;
    requestBody: SentenceAnnotationUpdate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
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
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
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
   * Returns all SentenceAnnotations of the User for the SourceDocument
   * @returns SentenceAnnotatorResult Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<SentenceAnnotatorResult> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/sdoc/{sdoc_id}/user/{user_id}",
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
   * Updates SentenceAnnotation in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateSentAnnoAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/bulk/update",
      body: requestBody,
      mediaType: "application/json",
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
  /**
   * Counts the SentenceAnnotations of the User (by user_id) per Codes (by class_ids) in Documents (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countAnnotations({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: Body_sentenceAnnotation_count_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/sentence/count_annotations/{user_id}",
      path: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
