/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DuplicateFinderInput } from "../models/DuplicateFinderInput";
import type { DuplicateFinderJobRead } from "../models/DuplicateFinderJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class JobService {
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
}
