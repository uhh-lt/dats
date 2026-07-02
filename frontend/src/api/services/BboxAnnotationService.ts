/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationCreate } from "../models/BBoxAnnotationCreate";
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { BBoxAnnotationUpdate } from "../models/BBoxAnnotationUpdate";
import type { BBoxAnnotationUpdateBulk } from "../models/BBoxAnnotationUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class BboxAnnotationService {
  /**
   * Creates a BBoxAnnotation
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addBboxAnnotation({
    requestBody,
  }: {
    requestBody: BBoxAnnotationCreate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bbox",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    bboxId,
    requestBody,
  }: {
    bboxId: number;
    requestBody: BBoxAnnotationUpdate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all BBoxAnnotations of the User for the SourceDocument
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/sdoc/{sdoc_id}/user/{user_id}",
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
   * Updates BBoxAnnotation in Bulk
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBboxAnnoAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<BBoxAnnotationUpdateBulk>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all BBoxAnnotations with the given IDs.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulkById({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bbox/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotations with the given Code of the logged-in User
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
