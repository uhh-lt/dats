/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OutputFormat } from "@models/OutputFormat";
import type { PromptExamplesCreate } from "@models/PromptExamplesCreate";
import type { PromptLanguage } from "@models/PromptLanguage";
import type { PromptPreview } from "@models/PromptPreview";
import type { PromptPreviewRequest } from "@models/PromptPreviewRequest";
import type { PromptTaskInfo } from "@models/PromptTaskInfo";
import type { PromptTemplateContent } from "@models/PromptTemplateContent";
import type { PromptTemplateCreate } from "@models/PromptTemplateCreate";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { PromptTemplateUpdate } from "@models/PromptTemplateUpdate";
import type { PromptTemplateVersionCreate } from "@models/PromptTemplateVersionCreate";
import type { PromptTemplateVersionRead } from "@models/PromptTemplateVersionRead";
import type { SentencePromptExample } from "@models/SentencePromptExample";
import type { SpanPromptExample } from "@models/SpanPromptExample";
import type { TaskType } from "@models/TaskType";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class PromptTemplateService {
  /**
   * Creates a prompt template with its first version
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: PromptTemplateCreate }): CancelablePromise<PromptTemplateRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/prompt_template",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Saves a prompt with its selections as the next immutable version of the prompt template
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static createVersion({
    promptTemplateId,
    requestBody,
  }: {
    promptTemplateId: number;
    requestBody: PromptTemplateVersionCreate;
  }): CancelablePromise<PromptTemplateRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/prompt_template/{prompt_template_id}/version",
      path: {
        prompt_template_id: promptTemplateId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Turns span or sentence annotations into few-shot examples for a prompt template
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
      url: "/prompt_template/examples",
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
      url: "/prompt_template/preview",
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
      url: "/prompt_template/task_info",
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
   * @returns PromptTemplateContent Successful Response
   * @throws ApiError
   */
  public static getDefault({
    outputFormat,
    language,
  }: {
    outputFormat: OutputFormat;
    language: PromptLanguage;
  }): CancelablePromise<PromptTemplateContent> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt_template/default",
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
   * Returns the prompt templates of the project with all their versions
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<PromptTemplateRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt_template/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the prompt template version with the given ID
   * @returns PromptTemplateVersionRead Successful Response
   * @throws ApiError
   */
  public static getVersionById({ versionId }: { versionId: number }): CancelablePromise<PromptTemplateVersionRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt_template/version/{version_id}",
      path: {
        version_id: versionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the prompt template with the given ID and all its versions
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static getById({ promptTemplateId }: { promptTemplateId: number }): CancelablePromise<PromptTemplateRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/prompt_template/{prompt_template_id}",
      path: {
        prompt_template_id: promptTemplateId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Renames or (un)archives the prompt template (does not create a version)
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    promptTemplateId,
    requestBody,
  }: {
    promptTemplateId: number;
    requestBody: PromptTemplateUpdate;
  }): CancelablePromise<PromptTemplateRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/prompt_template/{prompt_template_id}",
      path: {
        prompt_template_id: promptTemplateId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
