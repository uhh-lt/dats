/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierJobInput } from "@models/ClassifierJobInput";
import type { ClassifierJobRead } from "@models/ClassifierJobRead";
import type { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import type { CrawlerJobInput } from "@models/CrawlerJobInput";
import type { CrawlerJobRead } from "@models/CrawlerJobRead";
import type { DuplicateFinderInput } from "@models/DuplicateFinderInput";
import type { DuplicateFinderJobRead } from "@models/DuplicateFinderJobRead";
import type { ExportJobInput } from "@models/ExportJobInput";
import type { ExportJobRead } from "@models/ExportJobRead";
import type { ImportJobRead } from "@models/ImportJobRead";
import type { LLMAssistantJobInput } from "@models/LLMAssistantJobInput";
import type { LlmAssistantJobRead } from "@models/LlmAssistantJobRead";
import type { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import type { TagRecommendationJobInput } from "@models/TagRecommendationJobInput";
import type { TagRecommendationJobRead } from "@models/TagRecommendationJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class JobService {
  /**
   * Get all Import jobs of the project
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static getImportJobsByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ImportJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/import",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start Classifier job
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static startClassifierJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ClassifierJobInput;
  }): CancelablePromise<ClassifierJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/classifier",
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
   * Get all Classifier jobs of the project
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static getClassifierJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ClassifierJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/classifier",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Classifier job
   * @returns ClassifierJobRead Successful Response
   * @throws ApiError
   */
  public static getClassifierJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<ClassifierJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/classifier/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort Classifier job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortClassifierJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/classifier/{job_id}/abort",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry Classifier job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryClassifierJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/classifier/{job_id}/retry",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all CotaRefinement jobs of the project
   * @returns COTARefinementJobRead Successful Response
   * @throws ApiError
   */
  public static getCotaRefinementJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<COTARefinementJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/cota-refinement",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get CotaRefinement job
   * @returns COTARefinementJobRead Successful Response
   * @throws ApiError
   */
  public static getCotaRefinementJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<COTARefinementJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/cota-refinement/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start Crawler job
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static startCrawlerJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: CrawlerJobInput;
  }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/crawler",
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
   * Get all Crawler jobs of the project
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static getCrawlerJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<CrawlerJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/crawler",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Crawler job
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static getCrawlerJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/crawler/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort Crawler job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortCrawlerJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/crawler/{job_id}/abort",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry Crawler job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryCrawlerJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/crawler/{job_id}/retry",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start DuplicateFinder job
   * @returns DuplicateFinderJobRead Successful Response
   * @throws ApiError
   */
  public static startDuplicateFinderJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: DuplicateFinderInput;
  }): CancelablePromise<DuplicateFinderJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/duplicate-finder",
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
   * Get DuplicateFinder job
   * @returns DuplicateFinderJobRead Successful Response
   * @throws ApiError
   */
  public static getDuplicateFinderJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<DuplicateFinderJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/duplicate-finder/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start LlmAssistant job
   * @returns LlmAssistantJobRead Successful Response
   * @throws ApiError
   */
  public static startLlmAssistantJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: LLMAssistantJobInput;
  }): CancelablePromise<LlmAssistantJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/llm-assistant",
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
   * Get all LlmAssistant jobs of the project
   * @returns LlmAssistantJobRead Successful Response
   * @throws ApiError
   */
  public static getLlmAssistantJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<LlmAssistantJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/llm-assistant",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get LlmAssistant job
   * @returns LlmAssistantJobRead Successful Response
   * @throws ApiError
   */
  public static getLlmAssistantJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<LlmAssistantJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/llm-assistant/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort LlmAssistant job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortLlmAssistantJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/llm-assistant/{job_id}/abort",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry LlmAssistant job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryLlmAssistantJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/llm-assistant/{job_id}/retry",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start Export job
   * @returns ExportJobRead Successful Response
   * @throws ApiError
   */
  public static startExportJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ExportJobInput;
  }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/export",
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
   * Get Export job
   * @returns ExportJobRead Successful Response
   * @throws ApiError
   */
  public static getExportJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/export/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Import job
   * @returns ImportJobRead Successful Response
   * @throws ApiError
   */
  public static getImportJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<ImportJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/import/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all Perspectives jobs of the project
   * @returns PerspectivesJobRead Successful Response
   * @throws ApiError
   */
  public static getPerspectivesJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<PerspectivesJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/perspectives",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Perspectives job
   * @returns PerspectivesJobRead Successful Response
   * @throws ApiError
   */
  public static getPerspectivesJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<PerspectivesJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/perspectives/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start TagRecommendation job
   * @returns TagRecommendationJobRead Successful Response
   * @throws ApiError
   */
  public static startTagRecommendationJob({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: TagRecommendationJobInput;
  }): CancelablePromise<TagRecommendationJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/tag-recommendation",
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
   * Get all TagRecommendation jobs of the project
   * @returns TagRecommendationJobRead Successful Response
   * @throws ApiError
   */
  public static getTagRecommendationJobsByProject({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<TagRecommendationJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/tag-recommendation",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get TagRecommendation job
   * @returns TagRecommendationJobRead Successful Response
   * @throws ApiError
   */
  public static getTagRecommendationJobById({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<TagRecommendationJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/jobs/tag-recommendation/{job_id}",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort TagRecommendation job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortTagRecommendationJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/tag-recommendation/{job_id}/abort",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry TagRecommendation job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryTagRecommendationJob({
    projectId,
    jobId,
  }: {
    projectId: number;
    jobId: string;
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/jobs/tag-recommendation/{job_id}/retry",
      path: {
        project_id: projectId,
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
