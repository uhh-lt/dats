/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RecentAnnotatedDocument } from "@models/RecentAnnotatedDocument";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnnotationDashboardService {
  /**
   * Lists the current user's recently annotated documents.
   * @returns RecentAnnotatedDocument Successful Response
   * @throws ApiError
   */
  public static getRecentDocuments({
    projectId,
    limit = 10,
  }: {
    projectId: number;
    limit?: number;
  }): CancelablePromise<Array<RecentAnnotatedDocument>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/annotation-dashboard/project/{project_id}/recent-documents",
      path: {
        project_id: projectId,
      },
      query: {
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
