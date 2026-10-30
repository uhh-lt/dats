/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AgentQueryRequest = {
  /**
   * AgentSession to continue (a new one is started if omitted)
   */
  session_id?: string | null;
  /**
   * The user's prompt
   */
  prompt: string;
};
