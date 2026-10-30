/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AgentName } from "./AgentName";
export type AgentSessionRead = {
  /**
   * Client-chosen ID of the AgentSession
   */
  session_id: string;
  /**
   * Title of the AgentSession
   */
  title: string;
  /**
   * ID of the AgentSession
   */
  id: number;
  /**
   * User the AgentSession belongs to
   */
  user_id: number;
  /**
   * Project the AgentSession belongs to
   */
  project_id: number;
  /**
   * Agent the AgentSession talks to
   */
  agent_name: AgentName;
  /**
   * Created timestamp of the AgentSession
   */
  created: string;
  /**
   * Updated timestamp of the AgentSession
   */
  updated: string;
};
