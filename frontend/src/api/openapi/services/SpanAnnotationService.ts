/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "../models/CodeRead";
import type { SpanAnnotationCreate } from "../models/SpanAnnotationCreate";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanAnnotationReadResolved } from "../models/SpanAnnotationReadResolved";
import type { SpanAnnotationUpdate } from "../models/SpanAnnotationUpdate";
import type { SpanAnnotationUpdateBulk } from "../models/SpanAnnotationUpdateBulk";
import type { SpanGroupRead } from "../models/SpanGroupRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SpanAnnotationService {
  /**
   * Creates a SpanAnnotation
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotation({
    requestBody,
    resolve = true,
  }: {
    requestBody: SpanAnnotationCreate;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span",
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
   * Creates SpanAnnotations in Bulk
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotationsBulk({
    requestBody,
    resolve = true,
  }: {
    requestBody: Array<SpanAnnotationCreate>;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<SpanAnnotationRead> | Array<SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span/bulk/create",
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
   * Returns the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getById({
    spanId,
    resolve = true,
  }: {
    spanId: number;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
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
   * Updates the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    spanId,
    requestBody,
    resolve = true,
  }: {
    spanId: number;
    requestBody: SpanAnnotationUpdate;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
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
   * Deletes the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({
    spanId,
  }: {
    spanId: number;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SpanAnnotations in Bulk
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateSpanAnnotationsBulk({
    requestBody,
    resolve = true,
  }: {
    requestBody: Array<SpanAnnotationUpdateBulk>;
    /**
     * If true, the code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<SpanAnnotationRead> | Array<SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/bulk/update",
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
   * Returns the Code of the SpanAnnotation with the given ID if it exists.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCode({ spanId }: { spanId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/code",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanGroups that contain the the SpanAnnotation.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllGroups({ spanId }: { spanId: number }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SpanAnnotation from all SpanGroups
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeFromAllGroups({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Adds the SpanAnnotation to the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addToGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SpanAnnotation from the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeFromGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotations with the given Code of the logged-in User
   * @returns SpanAnnotationReadResolved Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
