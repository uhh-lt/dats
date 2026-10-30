import { AgentService } from "@api/services/AgentService";
import { queryOptions } from "@tanstack/react-query";

/**
 * Query factory for the agent sessions of the logged-in user.
 *
 *   agentQueries.all()                ["agent"]
 *   agentQueries.sessions()           ["agent", "sessions"]
 *   agentQueries.history(sessionId)   ["agent", "history", sessionId]
 */
export const agentQueries = {
  all: () => ["agent"] as const,

  // the sessions of the logged-in user, most recently updated first
  sessions: () =>
    queryOptions({
      queryKey: [...agentQueries.all(), "sessions"] as const,
      queryFn: () => AgentService.getSessions(),
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
};
