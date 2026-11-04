import { AgentService } from "@api/services/AgentService";
import { AgentName } from "@models/AgentName";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for the agent sessions of the logged-in user.
 *
 *   agentQueries.all()                       ["agent"]
 *   agentQueries.byProject(projectId)        ["agent", "project", projectId]
 *   agentQueries.history(sessionId)          ["agent", "history", sessionId]
 *   agentQueries.tools(agentName)            ["agent", "tools", agentName]
 */
export const agentQueries = {
  all: () => ["agent"] as const,

  // the sessions of the logged-in user in a project, most recently updated first
  byProjectScope: () => [...agentQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...agentQueries.byProjectScope(), projectId] as const,
      queryFn: () => AgentService.getByProject({ projectId }),
    }),

  // the messages of one session as AG-UI messages; every run changes them,
  // so they are always stale
  historyScope: () => [...agentQueries.all(), "history"] as const,
  history: (sessionId: string) =>
    queryOptions({
      queryKey: [...agentQueries.historyScope(), sessionId] as const,
      queryFn: () => AgentService.getSessionHistory({ sessionId }),
      staleTime: 0,
    }),

  // the tools of an agent and whether they need approval; they change only
  // with a backend release
  toolsScope: () => [...agentQueries.all(), "tools"] as const,
  tools: (agentName: AgentName) =>
    queryOptions({
      queryKey: [...agentQueries.toolsScope(), agentName] as const,
      queryFn: () => AgentService.getTools({ agentName }),
      staleTime: Infinity,
    }),
};
