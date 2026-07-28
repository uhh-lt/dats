/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeCreate } from "@models/CodeCreate";
import type { CodeDelete } from "@models/CodeDelete";
import type { CodeFilterConceptRead } from "@models/CodeFilterConceptRead";
import type { CodeFilterVersionSummary } from "@models/CodeFilterVersionSummary";
import type { CodeRead } from "@models/CodeRead";
import type { CodeSnapshotsRequest } from "@models/CodeSnapshotsRequest";
import type { CodeUpdate } from "@models/CodeUpdate";
import type { PaginatedCodeChangelog } from "@models/PaginatedCodeChangelog";
import type { PaginatedCodeFilterVersions } from "@models/PaginatedCodeFilterVersions";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodeService {
  /**
   * Lists all concepts and historical aliases in one codebook context.
   * @returns CodeFilterConceptRead Successful Response
   * @throws ApiError
   */
  public static getFilterConcepts({
    projectId,
    branchId,
  }: {
    projectId: number;
    branchId?: number | null;
  }): CancelablePromise<Array<CodeFilterConceptRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}/filter-concepts",
      path: {
        project_id: projectId,
      },
      query: {
        branch_id: branchId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns current, released, and recent versions of a code concept.
   * @returns CodeFilterVersionSummary Successful Response
   * @throws ApiError
   */
  public static getFilterVersionSummary({
    projectId,
    conceptId,
    branchId,
  }: {
    projectId: number;
    conceptId: string;
    branchId?: number | null;
  }): CancelablePromise<CodeFilterVersionSummary> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}/concept/{concept_id}/filter-version-summary",
      path: {
        project_id: projectId,
        concept_id: conceptId,
      },
      query: {
        branch_id: branchId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Searches the complete version history of a code concept.
   * @returns PaginatedCodeFilterVersions Successful Response
   * @throws ApiError
   */
  public static getFilterVersions({
    projectId,
    conceptId,
    branchId,
    query,
    page = 1,
    pageSize = 20,
  }: {
    projectId: number;
    conceptId: string;
    branchId?: number | null;
    query?: string | null;
    page?: number;
    pageSize?: number;
  }): CancelablePromise<PaginatedCodeFilterVersions> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}/concept/{concept_id}/filter-versions",
      path: {
        project_id: projectId,
        concept_id: conceptId,
      },
      query: {
        branch_id: branchId,
        query: query,
        page: page,
        page_size: pageSize,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a versioned Code.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static createNewCode({ requestBody }: { requestBody: CodeCreate }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/code",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the complete history of one logical Code.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getHistory({
    projectId,
    conceptId,
  }: {
    projectId: number;
    conceptId: string;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}/concept/{concept_id}/history",
      path: {
        project_id: projectId,
        concept_id: conceptId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated code changes for the selected codebook.
   * @returns PaginatedCodeChangelog Successful Response
   * @throws ApiError
   */
  public static getChangelog({
    projectId,
    branchId,
    page = 1,
    pageSize = 10,
  }: {
    projectId: number;
    branchId?: number | null;
    page?: number;
    pageSize?: number;
  }): CancelablePromise<PaginatedCodeChangelog> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}/changelog",
      path: {
        project_id: projectId,
      },
      query: {
        branch_id: branchId,
        page: page,
        page_size: pageSize,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns current or historical Code snapshots in one request.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getSnapshots({
    requestBody,
  }: {
    requestBody: CodeSnapshotsRequest;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/code/snapshots/batch",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the visible Main or branch Code tree.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    branchId,
  }: {
    projectId: number;
    branchId?: number | null;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{project_id}",
      path: {
        project_id: projectId,
      },
      query: {
        branch_id: branchId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns a specific current or historical Code snapshot.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getById({ codeId }: { codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates an updated snapshot of a Code.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    codeId,
    requestBody,
  }: {
    codeId: number;
    requestBody: CodeUpdate;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Tombstones a Code, optionally cascading to its subtree.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    codeId,
    requestBody,
  }: {
    codeId: number;
    requestBody: CodeDelete;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
