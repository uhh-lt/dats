import { AgentService } from "@api/services/AgentService";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useMutation } from "@tanstack/react-query";
import { agentQueries } from "./agentQueries";

// AGENT SESSION MUTATIONS

const useRenameSession = () =>
  useMutation({
    mutationKey: [...agentQueries.all(), "renameSession"],
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      AgentService.updateSession({ sessionId, requestBody: { title } }),
    meta: {
      datsEvent: "AGENT_SESSION_UPDATED",
      successMessage: (session: AgentSessionRead) => `Renamed chat to ${session.title}`,
    },
  });

const useDeleteSession = () =>
  useMutation({
    mutationKey: [...agentQueries.all(), "deleteSession"],
    mutationFn: ({ sessionId }: { sessionId: string }) => AgentService.deleteSession({ sessionId }),
    meta: {
      datsEvent: "AGENT_SESSION_DELETED",
      successMessage: (session: AgentSessionRead) => `Deleted chat ${session.title ?? ""}`,
    },
  });

export const AgentHooks = {
  useRenameSession,
  useDeleteSession,
};
