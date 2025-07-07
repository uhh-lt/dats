/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_chat_rag_with_session } from "../models/Body_chat_rag_with_session";
import type { LLMSessionResponse } from "../models/LLMSessionResponse";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ChatService {
  /**
   * Answer a query using Retrieval-Augmented Generation (RAG)
   * @returns LLMSessionResponse Successful Response
   * @throws ApiError
   */
  public static ragWithSession({
    projId,
    topK,
    threshold,
    requestBody,
    sessionId,
  }: {
    projId: number;
    topK: number;
    threshold: number;
    requestBody: Body_chat_rag_with_session;
    sessionId?: string | null;
  }): CancelablePromise<LLMSessionResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/chat/rag",
      query: {
        proj_id: projId,
        top_k: topK,
        threshold: threshold,
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
   * @returns LLMSessionResponse Successful Response
   * @throws ApiError
   */
  public static chatSesh({
    prompt,
    sessionId,
  }: {
    prompt: string;
    sessionId?: string | null;
  }): CancelablePromise<LLMSessionResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/chat/chat_session",
      query: {
        prompt: prompt,
        session_id: sessionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
