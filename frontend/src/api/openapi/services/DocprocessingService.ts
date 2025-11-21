/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_docprocessing_upload_files } from "../models/Body_docprocessing_upload_files";
import type { DocType } from "../models/DocType";
import type { SdocHealthResult } from "../models/SdocHealthResult";
import type { SdocHealthSort } from "../models/SdocHealthSort";
import type { SDocStatus } from "../models/SDocStatus";
import type { SourceDocumentStatusSimple } from "../models/SourceDocumentStatusSimple";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocprocessingService {
  /**
   * Get all column names (the job names) for the given document type
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getSearchColumnsByDoctype({ doctype }: { doctype: DocType }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/docprocessing/searchColumns/{doctype}",
      path: {
        doctype: doctype,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all SourceDocumentStatusDetailed for the Project with the given ID by status
   * @returns SdocHealthResult Successful Response
   * @throws ApiError
   */
  public static searchSdocHealth({
    projId,
    doctype,
    page,
    pageSize,
    requestBody,
  }: {
    projId: number;
    doctype: DocType;
    page: number;
    pageSize: number;
    requestBody: Array<SdocHealthSort>;
  }): CancelablePromise<SdocHealthResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/docprocessing/project/{proj_id}/search",
      path: {
        proj_id: projId,
      },
      query: {
        doctype: doctype,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
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
  /**
   * Retries doc processing jobs for SourceDocuments in the given Project and document type
   * @returns SdocHealthResult Successful Response
   * @throws ApiError
   */
  public static retryFailedSdocs({
    projId,
    doctype,
    requestBody,
  }: {
    projId: number;
    doctype: DocType;
    requestBody: Array<number>;
  }): CancelablePromise<SdocHealthResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/docprocessing/project/{proj_id}/retry",
      path: {
        proj_id: projId,
      },
      query: {
        doctype: doctype,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
