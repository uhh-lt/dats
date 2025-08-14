/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_docprocessing_upload_files } from "../models/Body_docprocessing_upload_files";
import type { SDocStatus } from "../models/SDocStatus";
import type { SourceDocumentStatusRead } from "../models/SourceDocumentStatusRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocprocessingService {
  /**
   * Get all SourceDocumentStatus for the Project with the given ID by status
   * @returns SourceDocumentStatusRead Successful Response
   * @throws ApiError
   */
  public static getSdocStatusByProjectAndStatus({
    projId,
    status,
  }: {
    projId: number;
    status: SDocStatus;
  }): CancelablePromise<Array<SourceDocumentStatusRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/docprocessing/project/{proj_id}/status/{status}",
      path: {
        proj_id: projId,
        status: status,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Uploads one or multiple files to the Project with the given ID if it exists
   * @returns string Successful Response
   * @throws ApiError
   */
  public static uploadFiles({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_docprocessing_upload_files;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/docprocessing/project/{proj_id}",
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
}
