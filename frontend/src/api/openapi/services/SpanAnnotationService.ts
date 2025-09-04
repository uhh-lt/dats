/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_spanAnnotation_count_annotations } from "../models/Body_spanAnnotation_count_annotations";
import type { SpanAnnotationCreate } from "../models/SpanAnnotationCreate";
import type { SpanAnnotationDeleted } from "../models/SpanAnnotationDeleted";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanAnnotationUpdate } from "../models/SpanAnnotationUpdate";
import type { SpanAnnotationUpdateBulk } from "../models/SpanAnnotationUpdateBulk";
import type { SpanGroupRead } from "../models/SpanGroupRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SpanAnnotationService {
  /**
   * Creates a SpanAnnotation
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotation({
    requestBody,
  }: {
    requestBody: SpanAnnotationCreate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SpanAnnotationCreate>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span/bulk/create",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
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
   * Updates the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    spanId,
    requestBody,
  }: {
    spanId: number;
    requestBody: SpanAnnotationUpdate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
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
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteById({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationDeleted> {
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
   * Returns all SpanAnnotations of the User for the SourceDocument
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/sdoc/{sdoc_id}/user/{user_id}}",
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
   * Updates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateSpanAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SpanAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all SpanAnnotations with the given IDs.
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteBulkById({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SpanAnnotationDeleted>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
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
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static removeFromAllGroups({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationDeleted> {
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
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<SpanAnnotationRead>> {
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
  /**
   * Counts the SpanAnnotations of the User (by user_id) per Codes (by code_ids) in Documents (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countAnnotations({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: Body_spanAnnotation_count_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/span/count_annotations/{user_id}",
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
