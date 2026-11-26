/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaginatedSpanAnnotationHits } from "@models/PaginatedSpanAnnotationHits";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SearchAnnotateService {
  /**
   * Returns the character & token-level positions needed for creating SpanAnnotations.
   * @returns PaginatedSpanAnnotationHits Successful Response
   * @throws ApiError
   */
  public static autoAnnotate({
    projectId,
    query,
  }: {
    projectId: number;
    query: string;
  }): CancelablePromise<PaginatedSpanAnnotationHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/search-annotate/auto-annotate",
      path: {
        project_id: projectId,
      },
      query: {
        query: query,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
