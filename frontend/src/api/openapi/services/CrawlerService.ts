/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CrawlerJobParameters } from "../models/CrawlerJobParameters";
import type { CrawlerJobRead } from "../models/CrawlerJobRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class CrawlerService {
  /**
   * Returns the CrawlerJob for the given Parameters
   * Returns the CrawlerJob for the given Parameters
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static startCrawlerJob({
    requestBody,
  }: {
    requestBody: CrawlerJobParameters;
  }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/crawler",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the CrawlerJob for the given ID
   * Returns the CrawlerJob for the given ID if it exists
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static getCrawlerJob({ crawlerJobId }: { crawlerJobId: string }): CancelablePromise<CrawlerJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/crawler/{crawler_job_id}",
      path: {
        crawler_job_id: crawlerJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all CrawlerJobs for the given project ID
   * Returns all CrawlerJobs for the given project ID if it exists
   * @returns CrawlerJobRead Successful Response
   * @throws ApiError
   */
  public static getAllCrawlerJobs({ projectId }: { projectId: number }): CancelablePromise<Array<CrawlerJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/crawler/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
