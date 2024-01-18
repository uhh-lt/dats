/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisTableCreate } from "../models/AnalysisTableCreate";
import type { AnalysisTableRead } from "../models/AnalysisTableRead";
import type { AnalysisTableUpdate } from "../models/AnalysisTableUpdate";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AnalysisTableService {
  /**
   * Creates an AnalysisTable
   * @returns AnalysisTableRead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: AnalysisTableCreate }): CancelablePromise<AnalysisTableRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/analysisTable",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the AnalysisTable with the given ID if it exists
   * @returns AnalysisTableRead Successful Response
   * @throws ApiError
   */
  public static getById({ analysisTableId }: { analysisTableId: number }): CancelablePromise<AnalysisTableRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysisTable/{analysis_table_id}",
      path: {
        analysis_table_id: analysisTableId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the Analysis Table with the given ID if it exists
   * @returns AnalysisTableRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    analysisTableId,
    requestBody,
  }: {
    analysisTableId: number;
    requestBody: AnalysisTableUpdate;
  }): CancelablePromise<AnalysisTableRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/analysisTable/{analysis_table_id}",
      path: {
        analysis_table_id: analysisTableId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the AnalysisTable with the given ID if it exists
   * @returns AnalysisTableRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ analysisTableId }: { analysisTableId: number }): CancelablePromise<AnalysisTableRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/analysisTable/{analysis_table_id}",
      path: {
        analysis_table_id: analysisTableId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the AnalysisTable of the Project with the given ID and the User with the given ID if it exists
   * @returns AnalysisTableRead Successful Response
   * @throws ApiError
   */
  public static getByProjectAndUser({
    projectId,
    userId,
  }: {
    projectId: number;
    userId: number;
  }): CancelablePromise<Array<AnalysisTableRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysisTable/project/{project_id}/user/{user_id}",
      path: {
        project_id: projectId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
