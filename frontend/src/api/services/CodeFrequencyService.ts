/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_codeFrequency_compute_code_frequencies } from "@models/Body_codeFrequency_compute_code_frequencies";
import type { Body_codeFrequency_compute_code_occurrences } from "@models/Body_codeFrequency_compute_code_occurrences";
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
  public static computeCodeFrequencies({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_codeFrequency_compute_code_frequencies;
  }): CancelablePromise<Array<CodeFrequency>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/code-frequencies",
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
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeOccurrence Successful Response
   * @throws ApiError
   */
  public static computeCodeOccurrences({
    projectId,
    codeId,
    returnChildren,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    returnChildren: boolean;
    requestBody: Body_codeFrequency_compute_code_occurrences;
  }): CancelablePromise<Array<CodeOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/code-frequencies/occurrences",
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
