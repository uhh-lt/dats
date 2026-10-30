import { generalQueries } from "@api/general/generalQueries";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { SidebarContentLayout } from "@components/content-layouts";
import { Stack } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_MODEL } from "../../_utils/agentModelUtils";
import { agentQueries } from "../../api/agentQueries";
import { AgentActions } from "../../store/agentSlice";
import { AgentSessionList } from "./_components/AgentSessionList";
import { AgentToolbar } from "./_components/AgentToolbar";
import { AgentThread } from "./_components/thread/AgentThread";
import { useAgentRuntime } from "./_hooks/useAgentRuntime";

const routeApi = getRouteApi("/_auth/project/$projectId/agent");

export function AgentView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const sessionId = routeApi.useSearch({ select: (search) => search.sessionId });
  const navigate = routeApi.useNavigate();

  const agentName = useAppSelector((state) => state.agent.agentName);
  const storedModelName = useAppSelector((state) => state.agent.modelName);
  const dispatch = useAppDispatch();

  // a remembered LLM the provider no longer offers falls back to the default
  const models = useQuery(generalQueries.availableModels());
  const modelName =
    models.data === undefined || models.data.includes(storedModelName) ? storedModelName : DEFAULT_MODEL;

  const { runtime, threadId } = useAgentRuntime({ projectId, agentName, modelName });
  const sessions = useQuery(agentQueries.byProject(projectId));

  // the chat in the URL is opened once, when the page opens
  const initialSessionId = useRef(sessionId);
  useEffect(() => {
    if (initialSessionId.current) void runtime.threads.switchToThread(initialSessionId.current);
  }, [runtime]);
  // a new chat goes into the URL once its first run has stored it
  useEffect(() => {
    if (sessionId === threadId) return;
    if (!sessions.data?.some((session) => session.session_id === threadId)) return;
    void navigate({ search: { sessionId: threadId }, replace: true });
  }, [sessionId, threadId, sessions.data, navigate]);

  // a chat keeps its agent: opening one selects its agent ...
  const handleSelectSession = useCallback(
    (session: AgentSessionRead) => {
      dispatch(AgentActions.onAgentNameChange(session.agent_name));
      void navigate({ search: { sessionId: session.session_id }, replace: true });
      void runtime.threads.switchToThread(session.session_id);
    },
    [dispatch, navigate, runtime],
  );
  const handleNewSession = useCallback(() => {
    void navigate({ search: {}, replace: true });
    void runtime.threads.switchToNewThread();
  }, [navigate, runtime]);
  // ... and another agent starts a new chat
  const handleAgentNameChange = useCallback(
    (newAgentName: AgentName) => {
      dispatch(AgentActions.onAgentNameChange(newAgentName));
      if (runtime.thread.getState().messages.length > 0) handleNewSession();
    },
    [dispatch, runtime, handleNewSession],
  );
  const handleModelNameChange = useCallback(
    (newModelName: string) => dispatch(AgentActions.onModelNameChange(newModelName)),
    [dispatch],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarContentLayout
        layoutKey="agent-layout"
        sidebar={
          <AgentSessionList
            projectId={projectId}
            activeSessionId={threadId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />
        }
        content={
          <Stack height="100%" bgcolor="background.paper">
            <AgentToolbar
              agentName={agentName}
              modelName={modelName}
              onAgentNameChange={handleAgentNameChange}
              onModelNameChange={handleModelNameChange}
            />
            <AgentThread projectId={projectId} agentName={agentName} />
          </Stack>
        }
      />
    </AssistantRuntimeProvider>
  );
}
