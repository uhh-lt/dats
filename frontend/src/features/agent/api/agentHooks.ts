import { AgentService } from "@api/services/AgentService";
import { AgentName } from "@models/AgentName";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { agentQueries } from "./agentQueries";

// AGENT TOOL QUERIES

const useGetTool = (agentName: AgentName, toolName: string) =>
  useQuery({
    ...agentQueries.tools(agentName),
    select: (tools) => tools.find((tool) => tool.name === toolName),
  });

// AGENT SESSION MUTATIONS

const useUpdateAgentSession = () =>
  useMutation({
    mutationKey: [...agentQueries.all(), "updateAgentSession"],
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      AgentService.updateSession({ sessionId, requestBody: { title } }),
    meta: {
      datsEvent: "AGENT_SESSION_UPDATED",
      successMessage: (session: AgentSessionRead) => `Renamed chat to ${session.title}`,
    },
  });

const useDeleteAgentSession = () =>
  useMutation({
    mutationKey: [...agentQueries.all(), "deleteAgentSession"],
    mutationFn: ({ sessionId }: { sessionId: string }) => AgentService.deleteSession({ sessionId }),
    meta: {
      datsEvent: "AGENT_SESSION_DELETED",
      successMessage: (session: AgentSessionRead) => `Deleted chat ${session.title}`,
    },
  });

export const AgentHooks = {
  useGetTool,
  useUpdateAgentSession,
  useDeleteAgentSession,
};
