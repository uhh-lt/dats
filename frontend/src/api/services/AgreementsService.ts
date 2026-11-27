/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgreementParams } from "@models/AgreementParams";
import type { AgreementResult } from "@models/AgreementResult";
import type { SegmentTextsRequest } from "@models/SegmentTextsRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AgreementsService {
  /**
   * Compare the annotations of two annotators: scores, confusion matrix and segments.
   * @returns AgreementResult Successful Response
   * @throws ApiError
   */
  public static computeAgreement({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AgreementParams;
  }): CancelablePromise<AgreementResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/agreements",
      path: {
        project_id: projectId,
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
   * Export the raw agreement counts (TP, FP, FN) per document and code as CSV.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static export({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AgreementParams;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/agreements/export",
      path: {
        project_id: projectId,
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
   * Returns the texts of segments (character ranges of documents), in the order of the request.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static computeSegmentTexts({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SegmentTextsRequest;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/agreements/segment-texts",
      path: {
        project_id: projectId,
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
