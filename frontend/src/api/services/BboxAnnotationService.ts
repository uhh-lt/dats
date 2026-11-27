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
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: BBoxAnnotationCreate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/bbox-annotations",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the BBoxAnnotations of the User, optionally only those in the SourceDocument or with the Code
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates BBoxAnnotations in Bulk
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all BBoxAnnotations with the given IDs.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulk({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
