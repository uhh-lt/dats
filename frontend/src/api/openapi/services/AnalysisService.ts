/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisQueryParameters } from "../models/AnalysisQueryParameters";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AnalysisService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * Returns all SourceDocument Ids that match the query parameters.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static frequencyAnalysisAnalysisFrequencyAnalysisPost({
    requestBody,
  }: {
    requestBody: AnalysisQueryParameters;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/frequency_analysis",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
