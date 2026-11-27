/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OutputFormat } from "@models/OutputFormat";
import type { PromptContent } from "@models/PromptContent";
import type { PromptCreate } from "@models/PromptCreate";
import type { PromptExamplesCreate } from "@models/PromptExamplesCreate";
import type { PromptLanguage } from "@models/PromptLanguage";
import type { PromptPreview } from "@models/PromptPreview";
import type { PromptPreviewRequest } from "@models/PromptPreviewRequest";
import type { PromptRead } from "@models/PromptRead";
import type { PromptTaskInfo } from "@models/PromptTaskInfo";
import type { PromptUpdate } from "@models/PromptUpdate";
import type { PromptVersionCreate } from "@models/PromptVersionCreate";
import type { SentencePromptExample } from "@models/SentencePromptExample";
import type { SpanPromptExample } from "@models/SpanPromptExample";
import type { TaskType } from "@models/TaskType";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PromptService {
  /**
   * Creates a prompt with its first version
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static create({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: PromptCreate;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/prompts",
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
   * Returns the prompts of the project with all their versions
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<PromptRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/prompts",
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
   * Saves a prompt with its selections as the next immutable version of the prompt
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static createVersion({
    projectId,
    promptId,
    requestBody,
  }: {
    projectId: number;
    promptId: number;
    requestBody: PromptVersionCreate;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/prompts/{prompt_id}/versions",
      path: {
        project_id: projectId,
        prompt_id: promptId,
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
   * Turns span or sentence annotations into few-shot examples for a prompt
   * @returns any Successful Response
   * @throws ApiError
   */
  public static buildExamples({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: PromptExamplesCreate;
  }): CancelablePromise<Array<SpanPromptExample | SentencePromptExample>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/prompts/build-examples",
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
   * Returns the rendered prompt of a stored version or an unsaved draft for one message of a document
   * @returns PromptPreview Successful Response
   * @throws ApiError
   */
  public static preview({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: PromptPreviewRequest;
  }): CancelablePromise<PromptPreview> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/prompts/preview",
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
   * Returns the blocks that the prompts of a task can use
   * @returns PromptTaskInfo Successful Response
   * @throws ApiError
   */
  public static getTaskInfo({
    projectId,
    taskType,
  }: {
    projectId: number;
    taskType: TaskType;
  }): CancelablePromise<PromptTaskInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/prompts/task-info",
      path: {
        project_id: projectId,
      },
      query: {
        task_type: taskType,
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
   * Returns the default prompt of an output format in a language
   * @returns PromptContent Successful Response
   * @throws ApiError
   */
  public static getDefault({
    projectId,
    outputFormat,
    language,
  }: {
    projectId: number;
    outputFormat: OutputFormat;
    language: PromptLanguage;
  }): CancelablePromise<PromptContent> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/prompts/default",
      path: {
        project_id: projectId,
      },
      query: {
        output_format: outputFormat,
        language: language,
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
   * Returns the prompt with the given ID and all its versions
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static getById({
    projectId,
    promptId,
  }: {
    projectId: number;
    promptId: number;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/prompts/{prompt_id}",
      path: {
        project_id: projectId,
        prompt_id: promptId,
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
   * Renames or (un)archives the prompt (does not create a version)
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    projectId,
    promptId,
    requestBody,
  }: {
    projectId: number;
    promptId: number;
    requestBody: PromptUpdate;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/prompts/{prompt_id}",
      path: {
        project_id: projectId,
        prompt_id: promptId,
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
}
