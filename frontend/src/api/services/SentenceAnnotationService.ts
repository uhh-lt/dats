/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_sentenceAnnotation_count } from "@models/Body_sentenceAnnotation_count";
import type { SentenceAnnotationCreate } from "@models/SentenceAnnotationCreate";
import type { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import type { SentenceAnnotationUpdate } from "@models/SentenceAnnotationUpdate";
import type { SentenceAnnotationUpdateBulk } from "@models/SentenceAnnotationUpdateBulk";
import type { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SentenceAnnotationService {
  /**
   * Creates a SentenceAnnotation
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
    userId,
  }: {
    projectId: number;
    requestBody: SentenceAnnotationCreate;
    /**
     * The current user (default) or a virtual user of the project
     */
    userId?: number | null;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/sentence-annotations",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
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
   * Returns the SentenceAnnotations of the User, optionally only those in the SourceDocument or with the Code
   * @returns SentenceAnnotationRead Successful Response
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
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/sentence-annotations",
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
   * Creates SentenceAnnotations in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static createBulk({
    projectId,
    requestBody,
    userId,
  }: {
    projectId: number;
    requestBody: Array<SentenceAnnotationCreate>;
    /**
     * The current user (default) or a virtual user of the project
     */
    userId?: number | null;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/sentence-annotations/bulk",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
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
   * Updates SentenceAnnotations in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<SentenceAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/sentence-annotations/bulk",
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
   * Deletes all SentenceAnnotations with the given IDs.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/sentence-annotations/bulk",
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
   * Returns the SentenceAnnotations of the User in the SourceDocument, grouped by sentence
   * @returns SentenceAnnotatorResult Successful Response
   * @throws ApiError
   */
  public static getPerSentence({
    projectId,
    userId,
    sdocId,
  }: {
    projectId: number;
    userId: number;
    sdocId: number;
  }): CancelablePromise<SentenceAnnotatorResult> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/sentence-annotations/per-sentence",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
        sdoc_id: sdocId,
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
   * Returns the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    sentenceAnnotationId,
  }: {
    projectId: number;
    sentenceAnnotationId: number;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/sentence-annotations/{sentence_annotation_id}",
      path: {
        project_id: projectId,
        sentence_annotation_id: sentenceAnnotationId,
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
   * Updates the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    sentenceAnnotationId,
    requestBody,
  }: {
    projectId: number;
    sentenceAnnotationId: number;
    requestBody: SentenceAnnotationUpdate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/sentence-annotations/{sentence_annotation_id}",
      path: {
        project_id: projectId,
        sentence_annotation_id: sentenceAnnotationId,
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
   * Deletes the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    sentenceAnnotationId,
  }: {
    projectId: number;
    sentenceAnnotationId: number;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/sentence-annotations/{sentence_annotation_id}",
      path: {
        project_id: projectId,
        sentence_annotation_id: sentenceAnnotationId,
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
   * Counts the SentenceAnnotations of the User per Code (by code_ids) in the SourceDocuments (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static count({
    projectId,
    userId,
    requestBody,
  }: {
    projectId: number;
    userId: number;
    requestBody: Body_sentenceAnnotation_count;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/sentence-annotations/count",
      path: {
        project_id: projectId,
      },
      query: {
        user_id: userId,
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
