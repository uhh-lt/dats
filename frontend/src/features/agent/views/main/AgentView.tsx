import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { SidebarContentLayout } from "@components/content-layouts";
import { projectQueries } from "@core/project";
import { Alert, Stack } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AgentSessionList } from "./_components/AgentSessionList";
import { AgentThread } from "./_components/AgentThread";
import { AgentToolbar } from "./_components/AgentToolbar";
import { useAgentRuntime } from "./_hooks/useAgentRuntime";
import { DEFAULT_MODEL } from "./_utils/agentClientUtils";

const routeApi = getRouteApi("/_auth/project/$projectId/agent");

export function AgentView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });
  const projectTitle = useQuery({
    ...projectQueries.userProjects(),
    select: (projects) => projects.find((project) => project.id === projectId)?.title,
  }).data;

  const [agentName, setAgentName] = useState(AgentName.PROJECT);
  const [modelName, setModelName] = useState(DEFAULT_MODEL);
  const { runtime, threadId, error, clearError } = useAgentRuntime({ agentName, modelName, projectId, projectTitle });

  const handleSelectSession = useCallback(
    (sessionId: string) => void runtime.threads.switchToThread(sessionId),
    [runtime],
  );
  const handleNewSession = useCallback(() => void runtime.threads.switchToNewThread(), [runtime]);

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
          <Stack height="100%">
            <AgentToolbar
              agentName={agentName}
              modelName={modelName}
              onAgentNameChange={setAgentName}
              onModelNameChange={setModelName}
            />
            {error && (
              <Alert severity="warning" onClose={clearError} sx={{ mx: 2, mb: 1 }}>
                {error}
              </Alert>
            )}
            <AgentThread />
          </Stack>
        }
      />
    </AssistantRuntimeProvider>
  );
}
