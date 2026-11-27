/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_docProcessing_recompute } from "@models/Body_docProcessing_recompute";
import type { Body_docProcessing_upload } from "@models/Body_docProcessing_upload";
import type { DocType } from "@models/DocType";
import type { SdocHealthColumn } from "@models/SdocHealthColumn";
import type { SdocHealthResult } from "@models/SdocHealthResult";
import type { SdocHealthSort } from "@models/SdocHealthSort";
import type { SDocStatus } from "@models/SDocStatus";
import type { SourceDocumentStatusSimple } from "@models/SourceDocumentStatusSimple";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocProcessingService {
  /**
   * Get all columns (the pipeline steps) for the given document type, with whether each is a core step
   * @returns SdocHealthColumn Successful Response
   * @throws ApiError
   */
  public static getColumns({
    projectId,
    doctype,
  }: {
    projectId: number;
    doctype: DocType;
  }): CancelablePromise<Array<SdocHealthColumn>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/doc-processing/columns",
      path: {
        project_id: projectId,
      },
      query: {
        doctype: doctype,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all SourceDocumentStatusDetailed for the Project with the given ID by status
   * @returns SdocHealthResult Successful Response
   * @throws ApiError
   */
  public static searchStatuses({
    projectId,
    doctype,
    page,
    pageSize,
    requestBody,
  }: {
    projectId: number;
    doctype: DocType;
    page: number;
    pageSize: number;
    requestBody: Array<SdocHealthSort>;
  }): CancelablePromise<SdocHealthResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/doc-processing/statuses",
      path: {
        project_id: projectId,
      },
      query: {
        doctype: doctype,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all SourceDocumentStatusSimple for the Project with the given ID by status
   * @returns SourceDocumentStatusSimple Successful Response
   * @throws ApiError
   */
  public static getStatuses({
    projectId,
    status,
  }: {
    projectId: number;
    status: SDocStatus;
  }): CancelablePromise<Array<SourceDocumentStatusSimple>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/doc-processing/statuses",
      path: {
        project_id: projectId,
      },
      query: {
        status: status,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Uploads one or multiple files to the Project with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static upload({
    projectId,
    formData,
  }: {
    projectId: number;
    formData: Body_docProcessing_upload;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/doc-processing/upload",
      path: {
        project_id: projectId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retries doc processing jobs for SourceDocuments in the given Project and document type
   * @returns string Successful Response
   * @throws ApiError
   */
  public static retry({
    projectId,
    doctype,
    requestBody,
  }: {
    projectId: number;
    doctype: DocType;
    requestBody: Array<number>;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/doc-processing/retry",
      path: {
        project_id: projectId,
      },
      query: {
        doctype: doctype,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes the processing step for all SourceDocuments in the Project
   * @returns number Successful Response
   * @throws ApiError
   */
  public static recompute({
    projectId,
    processingStep,
    requestBody,
  }: {
    projectId: number;
    processingStep: string;
    requestBody: Body_docProcessing_recompute;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/doc-processing/recompute",
      path: {
        project_id: projectId,
      },
      query: {
        processing_step: processingStep,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
