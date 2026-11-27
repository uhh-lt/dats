/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_llmAssistant_count_existing_assistant_annotations } from "@models/Body_llmAssistant_count_existing_assistant_annotations";
import type { TaskType } from "@models/TaskType";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class LlmAssistantService {
  /**
   * Count the existing annotations of a virtual user per code, for the documents and codes of an LLM Assistant run
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countExistingAssistantAnnotations({
    projectId,
    taskType,
    virtualUserId,
    requestBody,
  }: {
    projectId: number;
    taskType: TaskType;
    virtualUserId: number;
    requestBody: Body_llmAssistant_count_existing_assistant_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/llm-assistant/count-existing-annotations",
      path: {
        project_id: projectId,
      },
      query: {
        task_type: taskType,
        virtual_user_id: virtualUserId,
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
