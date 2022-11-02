/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PreProProjectStatus } from "../models/PreProProjectStatus";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class PreproService {
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
