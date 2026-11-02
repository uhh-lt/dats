/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExperimentCreate } from "@models/ExperimentCreate";
import type { ExperimentRead } from "@models/ExperimentRead";
import type { ExperimentRunCreate } from "@models/ExperimentRunCreate";
import type { ExperimentRunLogFormat } from "@models/ExperimentRunLogFormat";
import type { ExperimentUpdate } from "@models/ExperimentUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ExperimentService {
  /**
   * Creates an experiment: documents, codes, task and a gold annotator who annotated every document
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: ExperimentCreate }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/experiment",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates and starts a run of an experiment with a prompt version and a model; the run writes into its own new virtual user. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static createRun({ requestBody }: { requestBody: ExperimentRunCreate }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/experiment/run",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the experiment with its runs
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static getById({ experimentId }: { experimentId: number }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/experiment/{experiment_id}",
      path: {
        experiment_id: experimentId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Renames the experiment and the virtual users of its runs. Documents, codes, task and gold annotator are fixed when the experiment is created.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    experimentId,
    requestBody,
  }: {
    experimentId: number;
    requestBody: ExperimentUpdate;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/experiment/{experiment_id}",
      path: {
        experiment_id: experimentId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the experiment with all its runs and their virtual users, including their annotations
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ experimentId }: { experimentId: number }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/experiment/{experiment_id}",
      path: {
        experiment_id: experimentId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all experiments of the project with their runs, newest first
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<ExperimentRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/experiment/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes and stores the agreement of the run with the gold annotator. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static refreshRunScores({ runId }: { runId: number }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/experiment/run/{run_id}/scores",
      path: {
        run_id: runId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes and stores the agreement of all finished runs of the experiment with the gold annotator, so that all runs are scored against the same state of the gold annotator. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static refreshAllRunScores({ experimentId }: { experimentId: number }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/experiment/{experiment_id}/scores",
      path: {
        experiment_id: experimentId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the run with its virtual user and its annotations. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static deleteRun({ runId }: { runId: number }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/experiment/run/{run_id}",
      path: {
        run_id: runId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Exports the log of a run as JSON or CSV. Returns the URL of the file.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static exportRunLog({
    runId,
    exportFormat,
  }: {
    runId: number;
    exportFormat: ExperimentRunLogFormat;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/experiment/run/{run_id}/export_log",
      path: {
        run_id: runId,
      },
      query: {
        export_format: exportFormat,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
