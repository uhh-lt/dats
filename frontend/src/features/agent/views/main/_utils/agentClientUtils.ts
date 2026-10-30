import { HttpAgent } from "@ag-ui/client";
import { OpenAPI } from "@api/core/OpenAPI";
import { AgentName } from "@models/AgentName";

// the backend's name for the provider's first LLM
export const DEFAULT_MODEL = "default";

const agentUrl = (agentName: AgentName) => `${OpenAPI.BASE}/agent/agui/${agentName}`;

// The AG-UI client sends its requests itself, so it adds the current access
// token of the generated client to each one (the token is refreshed there).
const fetchWithAccessToken = (url: string, init: RequestInit) => {
  const headers = new Headers(init.headers);
  if (typeof OpenAPI.TOKEN === "string") {
    headers.set("Authorization", `Bearer ${OpenAPI.TOKEN}`);
  }
  return fetch(url, { ...init, headers });
};

/**
 * The AG-UI client of the agent page. The assistant-ui runtime reads the
 * thread id (= the agent session id) from it, and its URL selects the agent.
 */
export class AgentClient extends HttpAgent {
  constructor(agentName: AgentName, threadId: string) {
    super({ url: agentUrl(agentName), threadId, fetch: fetchWithAccessToken });
  }

  selectAgent(agentName: AgentName): void {
    this.url = agentUrl(agentName);
  }

  selectThread(threadId: string): void {
    this.threadId = threadId;
  }
}
