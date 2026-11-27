/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationCountRequest } from "@models/SpanAnnotationCountRequest";
import type { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import type { SpanAnnotationDeleted } from "@models/SpanAnnotationDeleted";
import type { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import type { SpanAnnotationUpdate } from "@models/SpanAnnotationUpdate";
import type { SpanAnnotationUpdateBulk } from "@models/SpanAnnotationUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SpanAnnotationsService {
  /**
   * Creates a SpanAnnotation
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SpanAnnotationCreate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/span-annotations",
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
   * Returns the SpanAnnotations of the User, optionally only those in the SourceDocument or with the Code
   * @returns SpanAnnotationRead Successful Response
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
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/span-annotations",
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
   * Creates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static createBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<SpanAnnotationCreate>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/span-annotations/bulk",
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
   * Updates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<SpanAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/span-annotations/bulk",
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
   * Deletes all SpanAnnotations with the given IDs.
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<SpanAnnotationDeleted>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/span-annotations/bulk",
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
   * Returns the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    spanAnnotationId,
  }: {
    projectId: number;
    spanAnnotationId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/span-annotations/{span_annotation_id}",
      path: {
        project_id: projectId,
        span_annotation_id: spanAnnotationId,
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
   * Updates the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    spanAnnotationId,
    requestBody,
  }: {
    projectId: number;
    spanAnnotationId: number;
    requestBody: SpanAnnotationUpdate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/span-annotations/{span_annotation_id}",
      path: {
        project_id: projectId,
        span_annotation_id: spanAnnotationId,
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
   * Deletes the SpanAnnotation with the given ID.
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    spanAnnotationId,
  }: {
    projectId: number;
    spanAnnotationId: number;
  }): CancelablePromise<SpanAnnotationDeleted> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/span-annotations/{span_annotation_id}",
      path: {
        project_id: projectId,
        span_annotation_id: spanAnnotationId,
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
   * Counts the SpanAnnotations of the User per Code (by code_ids) in the SourceDocuments (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static count({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SpanAnnotationCountRequest;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/span-annotations/counts",
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
