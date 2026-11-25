/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_llm_assistant_count_existing_assistant_annotations } from "@models/Body_llm_assistant_count_existing_assistant_annotations";
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
    requestBody: Body_llm_assistant_count_existing_assistant_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/llm_assistant/count_existing_assistant_annotations",
      query: {
        project_id: projectId,
        task_type: taskType,
        virtual_user_id: virtualUserId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
