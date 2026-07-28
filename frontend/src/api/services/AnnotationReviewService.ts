/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationReviewBulkResolve } from "@models/AnnotationReviewBulkResolve";
import type { AnnotationReviewBulkResult } from "@models/AnnotationReviewBulkResult";
import type { AnnotationReviewCounts } from "@models/AnnotationReviewCounts";
import type { AnnotationReviewItem } from "@models/AnnotationReviewItem";
import type { AnnotationReviewResolve } from "@models/AnnotationReviewResolve";
import type { AnnotationReviewType } from "@models/AnnotationReviewType";
import type { PaginatedAnnotationReviews } from "@models/PaginatedAnnotationReviews";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnnotationReviewService {
  /**
   * Counts pending reviews by annotation type.
   * @returns AnnotationReviewCounts Successful Response
   * @throws ApiError
   */
  public static getReviewCounts({
    projectId,
    branchId,
    codeId,
  }: {
    projectId: number;
    branchId?: number | null;
    codeId?: number | null;
  }): CancelablePromise<AnnotationReviewCounts> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/annotation-review/project/{project_id}/counts",
      path: {
        project_id: projectId,
      },
      query: {
        branch_id: branchId,
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Lists pending reviews for one annotation type.
   * @returns PaginatedAnnotationReviews Successful Response
   * @throws ApiError
   */
  public static listReviews({
    projectId,
    annotationType,
    page = 1,
    pageSize = 50,
    userId,
    branchId,
    codeId,
  }: {
    projectId: number;
    annotationType: AnnotationReviewType;
    page?: number;
    pageSize?: number;
    userId?: number | null;
    branchId?: number | null;
    codeId?: number | null;
  }): CancelablePromise<PaginatedAnnotationReviews> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/annotation-review/project/{project_id}",
      path: {
        project_id: projectId,
      },
      query: {
        annotation_type: annotationType,
        page: page,
        page_size: pageSize,
        user_id: userId,
        branch_id: branchId,
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Resolves every pending review using one assigned Code snapshot.
   * @returns AnnotationReviewBulkResult Successful Response
   * @throws ApiError
   */
  public static resolveReviewsBulk({
    projectId,
    requestBody,
    branchId,
  }: {
    projectId: number;
    requestBody: AnnotationReviewBulkResolve;
    branchId?: number | null;
  }): CancelablePromise<AnnotationReviewBulkResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/annotation-review/project/{project_id}/bulk",
      path: {
        project_id: projectId,
      },
      query: {
        branch_id: branchId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Resolves or deletes a pending annotation review.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static resolveReview({
    projectId,
    annotationType,
    annotationId,
    requestBody,
    branchId,
  }: {
    projectId: number;
    annotationType: AnnotationReviewType;
    annotationId: number;
    requestBody: AnnotationReviewResolve;
    branchId?: number | null;
  }): CancelablePromise<AnnotationReviewItem | null> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/annotation-review/project/{project_id}/{annotation_type}/{annotation_id}",
      path: {
        project_id: projectId,
        annotation_type: annotationType,
        annotation_id: annotationId,
      },
      query: {
        branch_id: branchId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
