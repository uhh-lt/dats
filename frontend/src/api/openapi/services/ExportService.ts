/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExportJobParameters } from "../models/ExportJobParameters";
import type { ExportJobRead } from "../models/ExportJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ExportService {
  /**
   * Returns the ExportJob for the given Parameters
   * @returns ExportJobRead Successful Response
   * @throws ApiError
   */
  public static startExportJob({
    requestBody,
  }: {
    requestBody: ExportJobParameters;
  }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/export",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ExportJob for the given ID if it exists
   * @returns ExportJobRead Successful Response
   * @throws ApiError
   */
  public static getExportJob({ exportJobId }: { exportJobId: string }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/export/{export_job_id}",
      path: {
        export_job_id: exportJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
