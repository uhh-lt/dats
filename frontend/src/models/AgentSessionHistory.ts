/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActivityMessage } from "./ActivityMessage";
import type { AssistantMessage } from "./AssistantMessage";
import type { DeveloperMessage } from "./DeveloperMessage";
import type { ReasoningMessage } from "./ReasoningMessage";
import type { SystemMessage } from "./SystemMessage";
import type { ToolMessage } from "./ToolMessage";
import type { UserMessage } from "./UserMessage";
export type AgentSessionHistory = {
  /**
   * The messages of the AgentSession as AG-UI messages
   */
  messages: Array<
    DeveloperMessage | SystemMessage | AssistantMessage | UserMessage | ToolMessage | ActivityMessage | ReasoningMessage
  >;
};
