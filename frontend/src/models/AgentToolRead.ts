/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AgentToolRead = {
  /**
   * Name of the tool (the operation id of its endpoint)
   */
  name: string;
  /**
   * What the tool does (the summary of its endpoint)
   */
  description: string | null;
  /**
   * Whether the agent asks the user before it calls the tool
   */
  needs_approval: boolean;
};
