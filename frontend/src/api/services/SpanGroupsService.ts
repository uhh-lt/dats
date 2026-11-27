/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import type { SpanGroupCreate } from "@models/SpanGroupCreate";
import type { SpanGroupRead } from "@models/SpanGroupRead";
import type { SpanGroupUpdate } from "@models/SpanGroupUpdate";
import type { SpanGroupWithAnnotationsRead } from "@models/SpanGroupWithAnnotationsRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SpanGroupsService {
  /**
   * Creates a new SpanGroup and returns it with the generated ID.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SpanGroupCreate;
  }): CancelablePromise<SpanGroupRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/span-groups",
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
   * Returns the SpanGroups of the User with their SpanAnnotations, optionally only those in the SourceDocument or those that contain the SpanAnnotation
   * @returns SpanGroupWithAnnotationsRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    userId,
    sdocId,
    spanAnnotationId,
  }: {
    projectId: number;
    userId: number;
    sdocId?: number | null;
    spanAnnotationId?: number | null;
  }): CancelablePromise<Array<SpanGroupWithAnnotationsRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/span-groups",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
        sdoc_id: sdocId,
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
   * Adds the SpanAnnotation to the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotation({
    projectId,
    spanGroupId,
    spanAnnotationId,
  }: {
    projectId: number;
    spanGroupId: number;
    spanAnnotationId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/span-groups/{span_group_id}/span-annotations/{span_annotation_id}",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
   * Removes the SpanAnnotation from the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeSpanAnnotation({
    projectId,
    spanGroupId,
    spanAnnotationId,
  }: {
    projectId: number;
    spanGroupId: number;
    spanAnnotationId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/span-groups/{span_group_id}/span-annotations/{span_annotation_id}",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
   * Returns the SpanGroup with the given ID.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    spanGroupId,
  }: {
    projectId: number;
    spanGroupId: number;
  }): CancelablePromise<SpanGroupRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/span-groups/{span_group_id}",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
   * Updates the SpanGroup with the given ID.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    spanGroupId,
    requestBody,
  }: {
    projectId: number;
    spanGroupId: number;
    requestBody: SpanGroupUpdate;
  }): CancelablePromise<SpanGroupRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/span-groups/{span_group_id}",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
   * Deletes the SpanGroup with the given ID.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    spanGroupId,
  }: {
    projectId: number;
    spanGroupId: number;
  }): CancelablePromise<SpanGroupRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/span-groups/{span_group_id}",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
   * Returns all SpanAnnotations in the SpanGroup with the given ID
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getSpanAnnotations({
    projectId,
    spanGroupId,
  }: {
    projectId: number;
    spanGroupId: number;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/span-groups/{span_group_id}/span-annotations",
      path: {
        project_id: projectId,
        span_group_id: spanGroupId,
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
}
