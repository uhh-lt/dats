import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { SidebarContentLayout } from "@components/content-layouts";
import { projectQueries } from "@core/project";
import { Stack } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import { AgentActions } from "../../store/agentSlice";
import { AgentSessionList } from "./_components/AgentSessionList";
import { AgentToolbar } from "./_components/AgentToolbar";
import { AgentThread } from "./_components/thread/AgentThread";
import { useAgentRuntime } from "./_hooks/useAgentRuntime";

const routeApi = getRouteApi("/_auth/project/$projectId/agent");

export function AgentView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const projectTitle = useQuery({
    ...projectQueries.userProjects(),
    select: (projects) => projects.find((project) => project.id === projectId)?.title,
  }).data;

  const agentName = useAppSelector((state) => state.agent.agentName);
  const modelName = useAppSelector((state) => state.agent.modelName);
  const dispatch = useAppDispatch();
  const { runtime, threadId } = useAgentRuntime({ agentName, modelName, projectId, projectTitle });

  // a chat keeps its agent: opening one selects its agent ...
  const handleSelectSession = useCallback(
    (session: AgentSessionRead) => {
      dispatch(AgentActions.onAgentNameChange(session.agent_name));
      void runtime.threads.switchToThread(session.session_id);
    },
    [dispatch, runtime],
  );
  const handleNewSession = useCallback(() => void runtime.threads.switchToNewThread(), [runtime]);
  // ... and another agent starts a new chat
  const handleAgentNameChange = useCallback(
    (newAgentName: AgentName) => {
      dispatch(AgentActions.onAgentNameChange(newAgentName));
      if (runtime.thread.getState().messages.length > 0) void runtime.threads.switchToNewThread();
    },
    [dispatch, runtime],
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
            <AgentThread agentName={agentName} />
          </Stack>
        }
      />
    </AssistantRuntimeProvider>
  );
}
