/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApproachRecommendation } from "../models/ApproachRecommendation";
import type { ApproachType } from "../models/ApproachType";
import type { Body_llm_create_prompt_templates } from "../models/Body_llm_create_prompt_templates";
import type { LLMJobParameters } from "../models/LLMJobParameters";
import type { LLMJobParameters2_Input } from "../models/LLMJobParameters2_Input";
import type { LLMJobRead } from "../models/LLMJobRead";
import type { LLMPromptTemplates } from "../models/LLMPromptTemplates";
import type { TrainingParameters } from "../models/TrainingParameters";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class LlmService {
  /**
   * Returns the LLMJob for the given Parameters
   * @returns LLMJobRead Successful Response
   * @throws ApiError
   */
  public static startLlmJob({ requestBody }: { requestBody: LLMJobParameters2_Input }): CancelablePromise<LLMJobRead> {
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
  /**
   * Returns the system and user prompt templates for the given llm task in all supported languages
   * @returns LLMPromptTemplates Successful Response
   * @throws ApiError
   */
  public static createPromptTemplates({
    approachType,
    requestBody,
  }: {
    approachType: ApproachType;
    requestBody: Body_llm_create_prompt_templates;
  }): CancelablePromise<Array<LLMPromptTemplates>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/llm/create_prompt_templates",
      query: {
        approach_type: approachType,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the default training parameters for the given llm task
   * @returns TrainingParameters Successful Response
   * @throws ApiError
   */
  public static createTrainingParameters({
    requestBody,
  }: {
    requestBody: LLMJobParameters;
  }): CancelablePromise<TrainingParameters> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/llm/create_training_parameters",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Determines the appropriate approach based on the provided input
   * @returns ApproachRecommendation Successful Response
   * @throws ApiError
   */
  public static determineApproach({
    requestBody,
  }: {
    requestBody: LLMJobParameters;
  }): CancelablePromise<ApproachRecommendation> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/llm/determine_approach",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
