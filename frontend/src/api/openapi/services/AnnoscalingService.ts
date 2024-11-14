/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnnoscalingService {
  /**
   * Suggest annotations
   * Suggest annotations
   * @returns string Successful Response
   * @throws ApiError
   */
  public static suggest({
    projectId,
    codeId,
    topK,
  }: {
    projectId: number;
    codeId: number;
    topK: number;
  }): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/annoscaling/suggest",
      query: {
        project_id: projectId,
        code_id: codeId,
        top_k: topK,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
