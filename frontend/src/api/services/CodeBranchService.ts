/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeBranchChangeRead } from "@models/CodeBranchChangeRead";
import type { CodeBranchCreate } from "@models/CodeBranchCreate";
import type { CodeBranchRead } from "@models/CodeBranchRead";
import type { CodeMerge } from "@models/CodeMerge";
import type { CodeMergeResult } from "@models/CodeMergeResult";
import type { CodeRead } from "@models/CodeRead";
import type { CodeResolveConflict } from "@models/CodeResolveConflict";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodeBranchService {
  /**
   * Creates a collaborative branch.
   * @returns CodeBranchRead Successful Response
   * @throws ApiError
   */
  public static createBranch({ requestBody }: { requestBody: CodeBranchCreate }): CancelablePromise<CodeBranchRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/code-branch",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Lists project branches.
   * @returns CodeBranchRead Successful Response
   * @throws ApiError
   */
  public static listBranches({
    projectId,
    includeArchived = false,
  }: {
    projectId: number;
    includeArchived?: boolean;
  }): CancelablePromise<Array<CodeBranchRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code-branch/project/{project_id}",
      path: {
        project_id: projectId,
      },
      query: {
        include_archived: includeArchived,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Merges selected or all active branch changes into Main.
   * @returns CodeMergeResult Successful Response
   * @throws ApiError
   */
  public static mergeBranch({
    branchId,
    requestBody,
  }: {
    branchId: number;
    requestBody: CodeMerge;
  }): CancelablePromise<CodeMergeResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/code-branch/{branch_id}/merge",
      path: {
        branch_id: branchId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        409: `Conflict`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Lists active branch changes and their Main comparison snapshots.
   * @returns CodeBranchChangeRead Successful Response
   * @throws ApiError
   */
  public static listBranchChanges({ branchId }: { branchId: number }): CancelablePromise<Array<CodeBranchChangeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code-branch/{branch_id}/changes",
      path: {
        branch_id: branchId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Keeps or discards one conflicting branch change.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static resolveConflict({
    branchId,
    requestBody,
  }: {
    branchId: number;
    requestBody: CodeResolveConflict;
  }): CancelablePromise<CodeRead | null> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/code-branch/{branch_id}/resolve-conflict",
      path: {
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
   * Archives a branch and discards its active changes.
   * @returns CodeBranchRead Successful Response
   * @throws ApiError
   */
  public static archiveBranch({ branchId }: { branchId: number }): CancelablePromise<CodeBranchRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/code-branch/{branch_id}",
      path: {
        branch_id: branchId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
