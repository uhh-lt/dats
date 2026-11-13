/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgentName } from "@models/AgentName";
import type { AgentQueryRequest } from "@models/AgentQueryRequest";
import type { AgentQueryResponse } from "@models/AgentQueryResponse";
import type { AgentSessionHistory } from "@models/AgentSessionHistory";
import type { AgentSessionRead } from "@models/AgentSessionRead";
import type { AgentSessionUpdate } from "@models/AgentSessionUpdate";
import type { AgentToolRead } from "@models/AgentToolRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AgentService {
  /**
   * Returns the current user's agent sessions of the project, the most recently updated first.
   * @returns AgentSessionRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projectId }: { projectId: number }): CancelablePromise<Array<AgentSessionRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/agent/project/{project_id}/sessions",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the messages of the current user's agent session as AG-UI messages.
   * @returns AgentSessionHistory Successful Response
   * @throws ApiError
   */
  public static getSessionHistory({ sessionId }: { sessionId: string }): CancelablePromise<AgentSessionHistory> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/agent/sessions/{session_id}/history",
      path: {
        session_id: sessionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the tools (DATS endpoints) of the agent and whether they need the user's approval.
   * @returns AgentToolRead Successful Response
   * @throws ApiError
   */
  public static getTools({ agentName }: { agentName: AgentName }): CancelablePromise<Array<AgentToolRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/agent/{agent_name}/tools",
      path: {
        agent_name: agentName,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates (renames) the current user's agent session.
   * @returns AgentSessionRead Successful Response
   * @throws ApiError
   */
  public static updateSession({
    sessionId,
    requestBody,
  }: {
    sessionId: string;
    requestBody: AgentSessionUpdate;
  }): CancelablePromise<AgentSessionRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/agent/sessions/{session_id}",
      path: {
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
   * Deletes the current user's agent session.
   * @returns AgentSessionRead Successful Response
   * @throws ApiError
   */
  public static deleteSession({ sessionId }: { sessionId: string }): CancelablePromise<AgentSessionRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/agent/sessions/{session_id}",
      path: {
        session_id: sessionId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Answers a prompt with the agent, in a new or an existing session of the project.
   * @returns AgentQueryResponse Successful Response
   * @throws ApiError
   */
  public static askAgent({
    projectId,
    agentName,
    requestBody,
    model,
  }: {
    projectId: number;
    agentName: AgentName;
    requestBody: AgentQueryRequest;
    model?: string | null;
  }): CancelablePromise<AgentQueryResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/agent/project/{project_id}/{agent_name}",
      path: {
        project_id: projectId,
        agent_name: agentName,
      },
      query: {
        model: model,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
