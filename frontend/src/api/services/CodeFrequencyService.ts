/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_code_frequency_code_frequencies } from "@models/Body_code_frequency_code_frequencies";
import type { Body_code_frequency_code_occurrences } from "@models/Body_code_frequency_code_occurrences";
import type { CodeFrequency } from "@models/CodeFrequency";
import type { CodeOccurrence } from "@models/CodeOccurrence";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodeFrequencyService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeFrequency Successful Response
   * @throws ApiError
   */
  public static codeFrequencies({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_code_frequency_code_frequencies;
  }): CancelablePromise<Array<CodeFrequency>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/code-frequency/frequencies",
      path: {
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
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeOccurrence Successful Response
   * @throws ApiError
   */
  public static codeOccurrences({
    projectId,
    codeId,
    returnChildren,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    returnChildren: boolean;
    requestBody: Body_code_frequency_code_occurrences;
  }): CancelablePromise<Array<CodeOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/code-frequency/occurrences",
      path: {
        project_id: projectId,
      },
      query: {
        code_id: codeId,
        return_children: returnChildren,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
