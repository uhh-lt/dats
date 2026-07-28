/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodebookReleaseComparisonRead } from "@models/CodebookReleaseComparisonRead";
import type { CodebookReleaseCreate } from "@models/CodebookReleaseCreate";
import type { CodebookReleaseTreeRead } from "@models/CodebookReleaseTreeRead";
import type { PaginatedCodebookReleases } from "@models/PaginatedCodebookReleases";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodebookReleaseService {
  /**
   * Creates an immutable release from the current non-system Main tree.
   * @returns CodebookReleaseTreeRead Successful Response
   * @throws ApiError
   */
  public static createRelease({
    requestBody,
  }: {
    requestBody: CodebookReleaseCreate;
  }): CancelablePromise<CodebookReleaseTreeRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/codebook-release",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Lists immutable codebook releases newest first.
   * @returns PaginatedCodebookReleases Successful Response
   * @throws ApiError
   */
  public static listReleases({
    projectId,
    page = 1,
    pageSize = 20,
    query,
  }: {
    projectId: number;
    page?: number;
    pageSize?: number;
    query?: string | null;
  }): CancelablePromise<PaginatedCodebookReleases> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/codebook-release/project/{project_id}",
      path: {
        project_id: projectId,
      },
      query: {
        page: page,
        page_size: pageSize,
        query: query,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Compares a release with another release or current Main.
   * @returns CodebookReleaseComparisonRead Successful Response
   * @throws ApiError
   */
  public static compareRelease({
    releaseId,
    targetReleaseId,
  }: {
    releaseId: number;
    targetReleaseId?: number | null;
  }): CancelablePromise<CodebookReleaseComparisonRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/codebook-release/{release_id}/compare",
      path: {
        release_id: releaseId,
      },
      query: {
        target_release_id: targetReleaseId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns one release and its exact read-only historical code tree.
   * @returns CodebookReleaseTreeRead Successful Response
   * @throws ApiError
   */
  public static getRelease({ releaseId }: { releaseId: number }): CancelablePromise<CodebookReleaseTreeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/codebook-release/{release_id}",
      path: {
        release_id: releaseId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
