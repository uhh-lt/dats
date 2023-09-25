/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PreprocessingJobRead } from "../models/PreprocessingJobRead";
import type { PreProProjectStatus } from "../models/PreProProjectStatus";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class PreproService {
  /**
   * Returns the PreprocessingJob for the given ID
   * Returns the PreprocessingJob for the given ID if it exists
   * @returns PreprocessingJobRead Successful Response
   * @throws ApiError
   */
  public static getPreproJob({ preproJobId }: { preproJobId: string }): CancelablePromise<PreprocessingJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prepro/{prepro_job_id}",
      path: {
        prepro_job_id: preproJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Aborts the PreprocessingJob for the given ID
   * Aborts the PreprocessingJob for the given ID if it exists
   * @returns PreprocessingJobRead Successful Response
   * @throws ApiError
   */
  public static abortPreproJob({ preproJobId }: { preproJobId: string }): CancelablePromise<PreprocessingJobRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/prepro/{prepro_job_id}/abort",
      path: {
        prepro_job_id: preproJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all PreprocessingJobs for the given project ID
   * Returns all PreprocessingJobs for the given project ID if it exists
   * @returns PreprocessingJobRead Successful Response
   * @throws ApiError
   */
  public static getAllPreproJobs({ projectId }: { projectId: number }): CancelablePromise<Array<PreprocessingJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prepro/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the PreProProjectStatus of the Project with the given ID.
   * Returns the PreProProjectStatus of the Project with the given ID.
   * @returns PreProProjectStatus Successful Response
   * @throws ApiError
   */
  public static getProjectPreproStatus({ projId }: { projId: number }): CancelablePromise<PreProProjectStatus> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prepro/project/{proj_id}/status",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
