/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_rag_rag_session } from "../models/Body_rag_rag_session";
import type { ChatSessionResponse } from "../models/ChatSessionResponse";
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
    projId,
    topK,
    threshold,
    model,
    requestBody,
    sessionId,
  }: {
    projId: number;
    topK: number;
    threshold: number;
    model: string;
    requestBody: Body_rag_rag_session;
    sessionId?: string | null;
  }): CancelablePromise<ChatSessionResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/rag/rag_session",
      query: {
        proj_id: projId,
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
    model,
    prompt,
    sessionId,
  }: {
    model: string;
    prompt: string;
    sessionId?: string | null;
  }): CancelablePromise<ChatSessionResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/rag/chat_session",
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
  /**
   * Get all available LLM models from the LLM Provider
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getAvailableModels(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/rag/models",
    });
  }
}
