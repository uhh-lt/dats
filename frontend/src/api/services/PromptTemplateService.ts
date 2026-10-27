/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptTemplateCreate } from "@models/PromptTemplateCreate";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { PromptTemplateUpdate } from "@models/PromptTemplateUpdate";
import type { PromptTemplateVersionCreate } from "@models/PromptTemplateVersionCreate";
import type { PromptTemplateVersionRead } from "@models/PromptTemplateVersionRead";
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
   * Saves new prompts as the next immutable version of the prompt template
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
   * Renames the prompt template (does not create a version)
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
  /**
   * Removes the prompt template with all its versions
   * @returns PromptTemplateRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ promptTemplateId }: { promptTemplateId: number }): CancelablePromise<PromptTemplateRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/prompt_template/{prompt_template_id}",
      path: {
        prompt_template_id: promptTemplateId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
