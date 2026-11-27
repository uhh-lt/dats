/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SampledSdocsResults } from "@models/SampledSdocsResults";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentSampleService {
  /**
   * Sample & Aggregate Source Documents by tags.
   * @returns SampledSdocsResults Successful Response
   * @throws ApiError
   */
  public static computeDocumentSamples({
    projectId,
    n,
    frac,
    requestBody,
  }: {
    projectId: number;
    n: number;
    frac: number;
    requestBody: Array<Array<number>>;
  }): CancelablePromise<Array<SampledSdocsResults>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/document-samples",
      path: {
        project_id: projectId,
      },
      query: {
        n: n,
        frac: frac,
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
