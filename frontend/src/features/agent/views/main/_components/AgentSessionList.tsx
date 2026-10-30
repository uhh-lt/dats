import { useOpenConfirmationDialog } from "@core/notification";
import AddIcon from "@mui/icons-material/Add";
import { Alert, Box, Button, CircularProgress, Divider, List, Stack, Typography } from "@mui/material";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { AgentHooks } from "../../../api/agentHooks";
import { agentQueries } from "../../../api/agentQueries";
import { AgentSessionListItem } from "./AgentSessionListItem";

interface AgentSessionListProps {
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function AgentSessionList({ activeSessionId, onSelectSession, onNewSession }: AgentSessionListProps) {
  const sessions = useQuery(agentQueries.sessions());
  const deleteSession = AgentHooks.useDeleteSession();
  const openConfirmationDialog = useOpenConfirmationDialog();

  const handleDelete = useCallback(
    (session: AgentSessionRead) =>
      openConfirmationDialog({
        text: `Do you really want to delete the chat "${session.title || "Untitled chat"}"?`,
        onAccept: () =>
          deleteSession.mutate(
            { sessionId: session.session_id },
            {
              onSuccess: () => {
                if (session.session_id === activeSessionId) onNewSession();
              },
            },
          ),
      }),
    [openConfirmationDialog, deleteSession, activeSessionId, onNewSession],
  );

  return (
    <Stack height="100%" bgcolor="background.paper">
      <Box p={1}>
        <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={onNewSession}>
          New chat
        </Button>
      </Box>
      <Divider />
      {sessions.isLoading ? (
        <Box p={2} textAlign="center">
          <CircularProgress size={24} />
        </Box>
      ) : sessions.isError ? (
        <Alert severity="error">Could not load your chats: {sessions.error.message}</Alert>
      ) : sessions.data?.length === 0 ? (
        <Typography variant="body2" color="text.secondary" p={2}>
          Your chats appear here.
        </Typography>
      ) : (
        <List dense sx={{ flex: 1, overflowY: "auto" }}>
          {sessions.data?.map((session) => (
            <AgentSessionListItem
              key={session.id}
              session={session}
              isActive={session.session_id === activeSessionId}
              onSelect={onSelectSession}
              onDelete={handleDelete}
            />
          ))}
        </List>
      )}
    </Stack>
  );
}
