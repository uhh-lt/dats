import { AgentName } from "@models/AgentName";

export const AGENT_LABELS: Record<AgentName, string> = {
  [AgentName.PROJECT]: "Project agent",
  [AgentName.SOURCE_DOCUMENT]: "Document & annotation agent",
};
