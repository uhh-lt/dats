import { HttpAgent } from "@ag-ui/client";
import { OpenAPI } from "@api/core/OpenAPI";
import { AgentName } from "@models/AgentName";

const agentUrl = (projectId: number, agentName: AgentName) =>
  `${OpenAPI.BASE}/agent/project/${projectId}/${agentName}/agui`;

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
 * thread id (= the agent session id) from it, and its URL selects the
 * project and the agent.
 */
export class AgentClient extends HttpAgent {
  constructor(projectId: number, agentName: AgentName, threadId: string) {
    super({ url: agentUrl(projectId, agentName), threadId, fetch: fetchWithAccessToken });
  }

  selectAgent(projectId: number, agentName: AgentName): void {
    this.url = agentUrl(projectId, agentName);
  }

  selectThread(threadId: string): void {
    this.threadId = threadId;
  }
}
