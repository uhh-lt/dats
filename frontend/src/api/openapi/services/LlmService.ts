/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LLMJobParameters } from "../models/LLMJobParameters";
import type { LLMJobRead } from "../models/LLMJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class LlmService {
  /**
   * Returns the LLMJob for the given Parameters
   * @returns LLMJobRead Successful Response
   * @throws ApiError
   */
  public static startLlmJob({ requestBody }: { requestBody: LLMJobParameters }): CancelablePromise<LLMJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/llm",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the LLMJob for the given ID if it exists
   * @returns LLMJobRead Successful Response
   * @throws ApiError
   */
  public static getLlmJob({ llmJobId }: { llmJobId: string }): CancelablePromise<LLMJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/llm/{llm_job_id}",
      path: {
        llm_job_id: llmJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all LLMJobRead for the given project ID if it exists
   * @returns LLMJobRead Successful Response
   * @throws ApiError
   */
  public static getAllLlmJobs({ projectId }: { projectId: number }): CancelablePromise<Array<LLMJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/llm/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
