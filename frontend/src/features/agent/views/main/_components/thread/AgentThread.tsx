import { AssistantState, AuiIf, SuggestionPrimitive, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { getIconComponent, Icon } from "@components/icons";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { Box, ButtonBase, Fab, Skeleton, Stack, Typography } from "@mui/material";
import { AgentName } from "@models/AgentName";
import { AgentApprovals } from "./AgentApprovals";
import { AgentAssistantMessage } from "./AgentAssistantMessage";
import { AgentComposer } from "./AgentComposer";
import { AgentThreadProvider } from "./AgentThreadProvider";
import { AgentEditComposer, AgentUserMessage } from "./AgentUserMessage";

const THREAD_MAX_WIDTH = 820;

const isNewChat = (state: AssistantState) => state.thread.messages.length === 0 && !state.thread.isLoading;
// a chat that was opened from the list and still loads its history
const isLoadingHistory = (state: AssistantState) => state.thread.messages.length === 0 && state.thread.isLoading;

function AgentThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  const isEditing = useAuiState((state) => state.message.composer.isEditing);

  if (isEditing) return <AgentEditComposer />;
  if (role === "user") return <AgentUserMessage />;
  if (role === "assistant") return <AgentAssistantMessage />;
  return null;
}

function AgentWelcome() {
  return (
    <Stack alignItems="center" spacing={1} sx={{ mt: "15vh", mb: 3, color: "text.secondary", textAlign: "center" }}>
      {getIconComponent(Icon.AGENT, { sx: { fontSize: 40 } })}
      <Typography variant="h5" color="text.primary">
        How can I help with this project?
      </Typography>
      <Typography variant="body2">
        The agent reads and changes your project data. It asks before it deletes anything.
      </Typography>
    </Stack>
  );
}

function AgentSuggestions() {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
      <ThreadPrimitive.Suggestions>
        {() => (
          <SuggestionPrimitive.Trigger
            send
            render={
              <ButtonBase
                sx={{
                  display: "block",
                  textAlign: "left",
                  p: 1.5,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              />
            }
          >
            <Typography variant="body2" fontWeight={500}>
              <SuggestionPrimitive.Title />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <SuggestionPrimitive.Description />
            </Typography>
          </SuggestionPrimitive.Trigger>
        )}
      </ThreadPrimitive.Suggestions>
    </Box>
  );
}

function AgentHistorySkeleton() {
  return (
    <Stack spacing={3} role="status" aria-label="Loading the chat">
      <Skeleton variant="rounded" height={36} width="40%" sx={{ alignSelf: "flex-end" }} />
      <Stack spacing={1}>
        <Skeleton width="92%" />
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </Stack>
      <Skeleton variant="rounded" height={36} width="30%" sx={{ alignSelf: "flex-end" }} />
      <Stack spacing={1}>
        <Skeleton width="85%" />
        <Skeleton width="66%" />
      </Stack>
    </Stack>
  );
}

interface AgentThreadProps {
  projectId: number;
  agentName: AgentName;
}

/** The current chat: its messages, the pending approvals and the prompt input. */
export function AgentThread({ projectId, agentName }: AgentThreadProps) {
  return (
    <AgentThreadProvider projectId={projectId} agentName={agentName}>
      <ThreadPrimitive.Root render={<Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} />}>
        <ThreadPrimitive.Viewport
          turnAnchor="top"
          render={<Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }} />}
        >
          <Box
            sx={{
              flex: 1,
              width: "100%",
              maxWidth: THREAD_MAX_WIDTH,
              mx: "auto",
              px: 2,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AuiIf condition={isNewChat}>
              <AgentWelcome />
            </AuiIf>
            <AuiIf condition={isLoadingHistory}>
              <Box mt={3}>
                <AgentHistorySkeleton />
              </Box>
            </AuiIf>
            <Stack sx={{ pb: 2 }}>
              <ThreadPrimitive.Messages>{() => <AgentThreadMessage />}</ThreadPrimitive.Messages>
            </Stack>
            <ThreadPrimitive.ViewportFooter
              render={
                <Box
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    mt: "auto",
                    pb: 2,
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                />
              }
            >
              <ThreadPrimitive.ScrollToBottom
                render={
                  <Fab
                    size="small"
                    aria-label="Scroll to the end"
                    sx={{
                      position: "absolute",
                      top: -56,
                      alignSelf: "center",
                      bgcolor: "background.paper",
                      "&:disabled": { visibility: "hidden" },
                    }}
                  />
                }
              >
                <ArrowDownwardIcon fontSize="small" />
              </ThreadPrimitive.ScrollToBottom>
              <AgentApprovals />
              <AgentComposer />
              <AuiIf condition={(state) => isNewChat(state) && state.composer.isEmpty}>
                <AgentSuggestions />
              </AuiIf>
            </ThreadPrimitive.ViewportFooter>
          </Box>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AgentThreadProvider>
  );
}
