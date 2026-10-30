/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AgentQueryResponse = {
  /**
   * AgentSession the prompt was answered in
   */
  session_id: string;
  /**
   * The agent's answer
   */
  response: string;
  /**
   * Names of the tools the agent called
   */
  tools_used: Array<string>;
  /**
   * Names of the tools the agent wants to call, but which need the user's approval first (only possible via the AG-UI endpoint)
   */
  approvals_required: Array<string>;
};
