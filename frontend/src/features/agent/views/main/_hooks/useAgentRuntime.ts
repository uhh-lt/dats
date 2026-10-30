import { ApiError } from "@api/core/ApiError";
import { queryClient } from "@api/queryClient";
import { fromThreadMessageLike } from "@assistant-ui/react";
import { fromAgUiMessages, useAgUiRuntime, type UseAgUiThreadListAdapter } from "@assistant-ui/react-ag-ui";
import { AgentName } from "@models/AgentName";
import { useEffect, useMemo, useState } from "react";
import { agentQueries } from "../../../api/agentQueries";
import { AgentClient } from "../_utils/agentClientUtils";
import { AGENT_SUGGESTIONS } from "../_utils/agentSuggestionUtils";

interface UseAgentRuntimeProps {
  projectId: number;
  agentName: AgentName;
  // an LLM of the provider, or DEFAULT_MODEL (the provider's first)
  modelName: string;
}

// The stored messages of a session as thread messages; a session that does not
// exist (any more) is an empty thread, which its first run creates.
const loadSessionMessages = async (sessionId: string) => {
  try {
    const history = await queryClient.fetchQuery(agentQueries.history(sessionId));
    return fromAgUiMessages(history.messages).map((message, index) =>
      fromThreadMessageLike(message, `${sessionId}-${index}`, { type: "complete", reason: "unknown" }),
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
};

/**
 * The assistant-ui runtime of the agent page. It talks AG-UI to the backend:
 * a thread is an agent session of the project (the AG-UI thread id is the
 * session id), and the LLM is sent as `modelName`. The session list follows
 * the AGENT_SESSION events the backend sends during a run.
 */
export function useAgentRuntime({ projectId, agentName, modelName }: UseAgentRuntimeProps) {
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  // one AG-UI client for the page; the runtime reads the thread id from it
  const [agent] = useState(() => new AgentClient(projectId, agentName, threadId));
  useEffect(() => {
    agent.selectAgent(projectId, agentName);
  }, [agent, projectId, agentName]);

  const threadList: UseAgUiThreadListAdapter = useMemo(
    () => ({
      threadId,
      onSwitchToNewThread: async () => {
        const newThreadId = crypto.randomUUID();
        agent.selectThread(newThreadId);
        setThreadId(newThreadId);
      },
      onSwitchToThread: async (sessionId: string) => {
        // select the thread before awaiting its history, as the runtime requires
        agent.selectThread(sessionId);
        setThreadId(sessionId);
        return { messages: await loadSessionMessages(sessionId) };
      },
    }),
    [agent, threadId],
  );

  const runtime = useAgUiRuntime({
    agent,
    // the backend sends every step (reasoning, tool call, text) as its own
    // message; joined, a turn renders as one answer
    joinStrategy: "concat-content",
    suggestions: AGENT_SUGGESTIONS[agentName],
    adapters: { threadList },
  });

  // the backend reads the LLM from the forwarded props (`modelName`)
  useEffect(() => {
    return runtime.registerModelContextProvider({ getModelContext: () => ({ config: { modelName } }) });
  }, [runtime, modelName]);

  return { runtime, threadId };
}
