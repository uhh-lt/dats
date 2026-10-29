/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgreementParams } from "@models/AgreementParams";
import type { AgreementResult } from "@models/AgreementResult";
import type { AgreementTextRange } from "@models/AgreementTextRange";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AgreementService {
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
      url: "/agreement/compute",
      query: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Export the raw agreement counts (TP, FP, FN) per document and code as CSV.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static exportAgreementCounts({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: AgreementParams;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/agreement/export_counts",
      query: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the texts of segments (character ranges of documents), in the order of the request.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getSegmentTexts({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<AgreementTextRange>;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/agreement/segment_texts",
      query: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
