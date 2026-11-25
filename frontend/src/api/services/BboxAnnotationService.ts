/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationCreate } from "@models/BBoxAnnotationCreate";
import type { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import type { BBoxAnnotationUpdate } from "@models/BBoxAnnotationUpdate";
import type { BBoxAnnotationUpdateBulk } from "@models/BBoxAnnotationUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class BboxAnnotationService {
  /**
   * Creates a BBoxAnnotation
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static createBboxAnnotation({
    projectId,
    requestBody,
    userId,
  }: {
    projectId: number;
    requestBody: BBoxAnnotationCreate;
    /**
     * The current user (default) or a virtual user of the project
     */
    userId?: number | null;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/bbox-annotations",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the BBoxAnnotations of the User, optionally only those in the SourceDocument or with the Code
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getBboxAnnotations({
    projectId,
    userId,
    sdocId,
    codeId,
  }: {
    projectId: number;
    userId: number;
    sdocId?: number | null;
    codeId?: number | null;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/bbox-annotations",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
        sdoc_id: sdocId,
        code_id: codeId,
      },
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
  public static getById({
    projectId,
    bboxAnnotationId,
  }: {
    projectId: number;
    bboxAnnotationId: number;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/bbox-annotations/{bbox_annotation_id}",
      path: {
        project_id: projectId,
        bbox_annotation_id: bboxAnnotationId,
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
    projectId,
    bboxAnnotationId,
    requestBody,
  }: {
    projectId: number;
    bboxAnnotationId: number;
    requestBody: BBoxAnnotationUpdate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/bbox-annotations/{bbox_annotation_id}",
      path: {
        project_id: projectId,
        bbox_annotation_id: bboxAnnotationId,
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
  public static deleteById({
    projectId,
    bboxAnnotationId,
  }: {
    projectId: number;
    bboxAnnotationId: number;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/bbox-annotations/{bbox_annotation_id}",
      path: {
        project_id: projectId,
        bbox_annotation_id: bboxAnnotationId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates BBoxAnnotations in Bulk
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBboxAnnotationsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<BBoxAnnotationUpdateBulk>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/bbox-annotations/bulk",
      path: {
        project_id: projectId,
      },
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
  public static deleteBboxAnnotationsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/bbox-annotations/bulk",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
