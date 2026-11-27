/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChatSessionResponse } from "@models/ChatSessionResponse";
import type { RAGAnswerRequest } from "@models/RAGAnswerRequest";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class RagService {
  /**
   * Answer a query using Retrieval-Augmented Generation (RAG)
   * @returns ChatSessionResponse Successful Response
   * @throws ApiError
   */
  public static computeAnswer({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: RAGAnswerRequest;
  }): CancelablePromise<ChatSessionResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/rag/answer",
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
}
