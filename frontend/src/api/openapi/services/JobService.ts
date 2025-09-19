/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CrawlerJobInput_Input } from "../models/CrawlerJobInput_Input";
import type { CrawlerJobRead } from "../models/CrawlerJobRead";
import type { DuplicateFinderInput } from "../models/DuplicateFinderInput";
import type { DuplicateFinderJobRead } from "../models/DuplicateFinderJobRead";
import type { ExportJobInput } from "../models/ExportJobInput";
import type { ExportJobRead } from "../models/ExportJobRead";
import type { MLJobInput_Input } from "../models/MLJobInput_Input";
import type { MlJobRead } from "../models/MlJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class JobService {
  /**
   * Start Crawler job
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static startCrawlerJob({
    requestBody,
  }: {
    requestBody: CrawlerJobInput_Input;
  }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/crawler",
      body: requestBody,
      mediaType: "application/json",
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
  public static getCrawlerJobById({ jobId }: { jobId: string }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/job/crawler/{job_id}",
      path: {
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
  public static abortCrawlerJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/crawler/{job_id}/abort",
      path: {
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
  public static retryCrawlerJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/crawler/{job_id}/retry",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all Crawler jobs by project
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
      url: "/job/crawler/project/{project_id}",
      path: {
        project_id: projectId,
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
    requestBody,
  }: {
    requestBody: DuplicateFinderInput;
  }): CancelablePromise<DuplicateFinderJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/duplicate_finder",
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
  public static getDuplicateFinderJobById({ jobId }: { jobId: string }): CancelablePromise<DuplicateFinderJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/job/duplicate_finder/{job_id}",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Start Ml job
   * @returns MlJobRead Successful Response
   * @throws ApiError
   */
  public static startMlJob({ requestBody }: { requestBody: MLJobInput_Input }): CancelablePromise<MlJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/ml",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Ml job
   * @returns MlJobRead Successful Response
   * @throws ApiError
   */
  public static getMlJobById({ jobId }: { jobId: string }): CancelablePromise<MlJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/job/ml/{job_id}",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Abort Ml job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static abortMlJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/ml/{job_id}/abort",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Retry Ml job
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static retryMlJob({ jobId }: { jobId: string }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/ml/{job_id}/retry",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get all Ml jobs by project
   * @returns MlJobRead Successful Response
   * @throws ApiError
   */
  public static getMlJobsByProject({ projectId }: { projectId: number }): CancelablePromise<Array<MlJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/job/ml/project/{project_id}",
      path: {
        project_id: projectId,
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
  public static startExportJob({ requestBody }: { requestBody: ExportJobInput }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/job/export",
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
  public static getExportJobById({ jobId }: { jobId: string }): CancelablePromise<ExportJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/job/export/{job_id}",
      path: {
        job_id: jobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
