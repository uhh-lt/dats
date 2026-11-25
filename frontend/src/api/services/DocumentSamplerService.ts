/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SampledSdocsResults } from "@models/SampledSdocsResults";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentSamplerService {
  /**
   * Sample & Aggregate Source Documents by tags.
   * @returns SampledSdocsResults Successful Response
   * @throws ApiError
   */
  public static sampleSdocsByTags({
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
      url: "/projects/{project_id}/document-sampler/sample-by-tags",
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
        422: `Validation Error`,
      },
    });
  }
}
