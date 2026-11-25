/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_start_import_job } from "@models/Body_import_start_import_job";
import type { ImportJobRead } from "@models/ImportJobRead";
import type { ImportJobType } from "@models/ImportJobType";
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
      url: "/projects/{project_id}/jobs/import",
      path: {
        project_id: projectId,
      },
      query: {
        import_job_type: importJobType,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
