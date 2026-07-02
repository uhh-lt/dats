/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_start_import_job } from "../models/Body_import_start_import_job";
import type { ImportJobRead } from "../models/ImportJobRead";
import type { ImportJobType } from "../models/ImportJobType";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ImportService {
  /**
   * Starts an import job with the given parameters and file
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static startImportJob({
    projectId,
    importJobType,
    formData,
  }: {
    projectId: number;
    importJobType: ImportJobType;
    formData: Body_import_start_import_job;
  }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/import/{project_id}/type/{import_job_type}",
      path: {
        project_id: projectId,
        import_job_type: importJobType,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ImportJob for the given ID if it exists
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static getImportJob({ importJobId }: { importJobId: string }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/import/{import_job_id}",
      path: {
        import_job_id: importJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all ImportJobs for the given project ID if it exists
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static getAllImportJobs({ projectId }: { projectId: number }): CancelablePromise<Array<ImportJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/import/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
