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
import type { PromptVersionRead } from "@models/PromptVersionRead";
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
  public static create({ requestBody }: { requestBody: PromptCreate }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/prompt",
      body: requestBody,
      mediaType: "application/json",
      errors: {
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
    promptId,
    requestBody,
  }: {
    promptId: number;
    requestBody: PromptVersionCreate;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/prompt/{prompt_id}/version",
      path: {
        prompt_id: promptId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Turns span or sentence annotations into few-shot examples for a prompt
   * @returns any Successful Response
   * @throws ApiError
   */
  public static createExamples({
    requestBody,
  }: {
    requestBody: PromptExamplesCreate;
  }): CancelablePromise<Array<SpanPromptExample | SentencePromptExample>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/prompt/examples",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the rendered prompt of a stored version or an unsaved draft for one message of a document
   * @returns PromptPreview Successful Response
   * @throws ApiError
   */
  public static preview({ requestBody }: { requestBody: PromptPreviewRequest }): CancelablePromise<PromptPreview> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/prompt/preview",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the blocks that the prompts of a task can use
   * @returns PromptTaskInfo Successful Response
   * @throws ApiError
   */
  public static getTaskInfo({ taskType }: { taskType: TaskType }): CancelablePromise<PromptTaskInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt/task_info",
      query: {
        task_type: taskType,
      },
      errors: {
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
    outputFormat,
    language,
  }: {
    outputFormat: OutputFormat;
    language: PromptLanguage;
  }): CancelablePromise<PromptContent> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt/default",
      query: {
        output_format: outputFormat,
        language: language,
      },
      errors: {
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
      url: "/prompt/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the prompt version with the given ID
   * @returns PromptVersionRead Successful Response
   * @throws ApiError
   */
  public static getVersionById({ versionId }: { versionId: number }): CancelablePromise<PromptVersionRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt/version/{version_id}",
      path: {
        version_id: versionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the prompt with the given ID and all its versions
   * @returns PromptRead Successful Response
   * @throws ApiError
   */
  public static getById({ promptId }: { promptId: number }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt/{prompt_id}",
      path: {
        prompt_id: promptId,
      },
      errors: {
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
    promptId,
    requestBody,
  }: {
    promptId: number;
    requestBody: PromptUpdate;
  }): CancelablePromise<PromptRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/prompt/{prompt_id}",
      path: {
        prompt_id: promptId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
