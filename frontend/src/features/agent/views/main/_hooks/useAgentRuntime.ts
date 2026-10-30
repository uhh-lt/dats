import { queryClient } from "@api/queryClient";
import { fromThreadMessageLike } from "@assistant-ui/react";
import { fromAgUiMessages, useAgUiRuntime, type UseAgUiThreadListAdapter } from "@assistant-ui/react-ag-ui";
import { AgentName } from "@models/AgentName";
import { useCallback, useEffect, useMemo, useState } from "react";
import { agentQueries } from "../../../api/agentQueries";
import { AgentClient } from "../_utils/agentClientUtils";
import { AGENT_SUGGESTIONS } from "../_utils/agentSuggestionUtils";

interface UseAgentRuntimeProps {
  agentName: AgentName;
  // an LLM of the provider, or DEFAULT_MODEL
  modelName: string;
  projectId: number;
  projectTitle: string | undefined;
}

/**
 * The assistant-ui runtime of the agent page. It talks AG-UI to the backend:
 * a thread is an agent session (the AG-UI thread id is the session id), the
 * LLM is sent as `modelName` and the project as context.
 */
export function useAgentRuntime({ agentName, modelName, projectId, projectTitle }: UseAgentRuntimeProps) {
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  // one AG-UI client for the page; the runtime reads the thread id from it
  const [agent] = useState(() => new AgentClient(agentName, threadId));
  useEffect(() => {
    agent.selectAgent(agentName);
  }, [agent, agentName]);

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
        const history = await queryClient.fetchQuery(agentQueries.history(sessionId));
        const messages = fromAgUiMessages(history.messages).map((message, index) =>
          fromThreadMessageLike(message, `${sessionId}-${index}`, { type: "complete", reason: "unknown" }),
        );
        return { messages };
      },
    }),
    [agent, threadId],
  );

  const getRunContext = useCallback(
    () => [
      {
        description: "The DATS project the user works in",
        value: projectTitle ? `${projectTitle} (project id ${projectId})` : `project id ${projectId}`,
      },
    ],
    [projectId, projectTitle],
  );

  const runtime = useAgUiRuntime({
    agent,
    getRunContext,
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

  // The backend stores the session (and titles a new one) when a run ends,
  // without a DATS event, so the session list is refreshed then.
  useEffect(() => {
    let wasRunning = runtime.thread.getState().isRunning;
    return runtime.thread.subscribe(() => {
      const isRunning = runtime.thread.getState().isRunning;
      if (wasRunning && !isRunning) {
        void queryClient.invalidateQueries({ queryKey: agentQueries.sessions().queryKey });
      }
      wasRunning = isRunning;
    });
  }, [runtime]);

  return { runtime, threadId };
}
