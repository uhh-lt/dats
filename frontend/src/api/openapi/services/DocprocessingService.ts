/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_docprocessing_upload_files } from "../models/Body_docprocessing_upload_files";
import type { SDocStatus } from "../models/SDocStatus";
import type { SourceDocumentStatusDetailed } from "../models/SourceDocumentStatusDetailed";
import type { SourceDocumentStatusSimple } from "../models/SourceDocumentStatusSimple";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocprocessingService {
  /**
   * Get all SourceDocumentStatusSimple for the Project with the given ID by status
   * @returns SourceDocumentStatusSimple Successful Response
   * @throws ApiError
   */
  public static getSimpleSdocStatusByProjectAndStatus({
    projId,
    status,
  }: {
    projId: number;
    status: SDocStatus;
  }): CancelablePromise<Array<SourceDocumentStatusSimple>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/docprocessing/project/{proj_id}/status/{status}/simple",
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
   * Get all SourceDocumentStatusDetailed for the Project with the given ID by status
   * @returns SourceDocumentStatusDetailed Successful Response
   * @throws ApiError
   */
  public static getDetailedSdocStatusByProjectAndStatus({
    projId,
    status,
  }: {
    projId: number;
    status: SDocStatus;
  }): CancelablePromise<Array<SourceDocumentStatusDetailed>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/docprocessing/project/{proj_id}/status/{status}/detailed",
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
   * @returns number Successful Response
   * @throws ApiError
   */
  public static uploadFiles({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_docprocessing_upload_files;
  }): CancelablePromise<number> {
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
