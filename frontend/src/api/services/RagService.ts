/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_rag_rag_session } from "@models/Body_rag_rag_session";
import type { ChatSessionResponse } from "@models/ChatSessionResponse";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class RagService {
  /**
   * Answer a query using Retrieval-Augmented Generation (RAG)
   * @returns ChatSessionResponse Successful Response
   * @throws ApiError
   */
  public static ragSession({
    projectId,
    topK,
    threshold,
    model,
    requestBody,
    sessionId,
  }: {
    projectId: number;
    topK: number;
    threshold: number;
    model: string;
    requestBody: Body_rag_rag_session;
    sessionId?: string | null;
  }): CancelablePromise<ChatSessionResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/rag/session",
      path: {
        project_id: projectId,
      },
      query: {
        top_k: topK,
        threshold: threshold,
        model: model,
        session_id: sessionId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Initiate or continue a chat session with the LLM using a prompt
   * @returns ChatSessionResponse Successful Response
   * @throws ApiError
   */
  public static chatSession({
    projectId,
    model,
    prompt,
    sessionId,
  }: {
    projectId: number;
    model: string;
    prompt: string;
    sessionId?: string | null;
  }): CancelablePromise<ChatSessionResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/rag/chat-session",
      path: {
        project_id: projectId,
      },
      query: {
        model: model,
        prompt: prompt,
        session_id: sessionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
