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
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: ExperimentCreate;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/experiments",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
      url: "/projects/{project_id}/experiments",
      path: {
        project_id: projectId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates and starts a run of an experiment with a prompt version and a model; the run writes into its own new virtual user. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static createRun({
    projectId,
    experimentId,
    requestBody,
  }: {
    projectId: number;
    experimentId: number;
    requestBody: ExperimentRunCreate;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/experiments/{experiment_id}/runs",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the experiment with its runs
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    experimentId,
  }: {
    projectId: number;
    experimentId: number;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/experiments/{experiment_id}",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
    projectId,
    experimentId,
    requestBody,
  }: {
    projectId: number;
    experimentId: number;
    requestBody: ExperimentUpdate;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/experiments/{experiment_id}",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the experiment with all its runs and their virtual users, including their annotations
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    projectId,
    experimentId,
  }: {
    projectId: number;
    experimentId: number;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/experiments/{experiment_id}",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes and stores the agreement of the run with the gold annotator. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static refreshRunScores({
    projectId,
    experimentId,
    runId,
  }: {
    projectId: number;
    experimentId: number;
    runId: number;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/refresh-scores",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
        run_id: runId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Recomputes and stores the agreement of all finished runs of the experiment with the gold annotator, so that all runs are scored against the same state of the gold annotator. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static refreshScores({
    projectId,
    experimentId,
  }: {
    projectId: number;
    experimentId: number;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/experiments/{experiment_id}/refresh-scores",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the run with its virtual user and its annotations. Returns the experiment.
   * @returns ExperimentRead Successful Response
   * @throws ApiError
   */
  public static deleteRun({
    projectId,
    experimentId,
    runId,
  }: {
    projectId: number;
    experimentId: number;
    runId: number;
  }): CancelablePromise<ExperimentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
        run_id: runId,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
    projectId,
    experimentId,
    runId,
    exportFormat,
  }: {
    projectId: number;
    experimentId: number;
    runId: number;
    exportFormat: ExperimentRunLogFormat;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/experiments/{experiment_id}/runs/{run_id}/export-log",
      path: {
        project_id: projectId,
        experiment_id: experimentId,
        run_id: runId,
      },
      query: {
        export_format: exportFormat,
      },
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
