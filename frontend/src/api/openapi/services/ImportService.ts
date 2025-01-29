/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_start_import_codes_job } from "../models/Body_import_start_import_codes_job";
import type { Body_import_start_import_project_job } from "../models/Body_import_start_import_project_job";
import type { Body_import_start_import_tags_job } from "../models/Body_import_start_import_tags_job";
import type { ImportJobRead } from "../models/ImportJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ImportService {
  /**
   * Starts the import codes job on given project id.
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static startImportCodesJob({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_import_start_import_codes_job;
  }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/import/{proj_id}/codes",
      path: {
        proj_id: projId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Starts the import tags job on given project.
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static startImportTagsJob({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_import_start_import_tags_job;
  }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/import/{proj_id}/tags",
      path: {
        proj_id: projId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Starts the import project job on given project
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static startImportProjectJob({
    formData,
  }: {
    formData: Body_import_start_import_project_job;
  }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/import",
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
