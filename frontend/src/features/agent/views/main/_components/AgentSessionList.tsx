import { useOpenConfirmationDialog } from "@core/notification";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  List,
  ListSubheader,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { AgentHooks } from "../../../api/agentHooks";
import { agentQueries } from "../../../api/agentQueries";
import { groupSessionsByDate } from "../_utils/agentSessionUtils";
import { AgentSessionListItem } from "./AgentSessionListItem";

interface AgentSessionListProps {
  activeSessionId: string;
  onSelectSession: (session: AgentSessionRead) => void;
  onNewSession: () => void;
}

/** The user's chats, newest first, grouped by date and searchable by title. */
export function AgentSessionList({ activeSessionId, onSelectSession, onNewSession }: AgentSessionListProps) {
  const sessions = useQuery(agentQueries.sessions());
  const deleteSession = AgentHooks.useDeleteSession();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = (sessions.data ?? []).filter((session) => (session.title ?? "").toLowerCase().includes(query));
    return groupSessionsByDate(matching, new Date());
  }, [sessions.data, search]);

  const handleDelete = useCallback(
    (session: AgentSessionRead) =>
      openConfirmationDialog({
        text: `Do you really want to delete the chat "${session.title || "New chat"}"?`,
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

  const renderSessions = () => {
    if (sessions.isLoading) {
      return (
        <Box p={2} textAlign="center">
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (sessions.isError) {
      return <Alert severity="error">Could not load your chats: {sessions.error.message}</Alert>;
    }
    if (groups.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" p={2}>
          {search ? "No chat matches your search." : "Your chats appear here."}
        </Typography>
      );
    }
    return (
      <List dense sx={{ flex: 1, overflowY: "auto", py: 0 }} aria-label="Chats">
        {groups.map((group) => (
          <li key={group.label}>
            <ul style={{ padding: 0 }}>
              <ListSubheader sx={{ lineHeight: "32px", bgcolor: "background.paper" }}>{group.label}</ListSubheader>
              {group.sessions.map((session) => (
                <AgentSessionListItem
                  key={session.id}
                  session={session}
                  isActive={session.session_id === activeSessionId}
                  onSelect={onSelectSession}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </li>
        ))}
      </List>
    );
  };

  return (
    <Stack height="100%" bgcolor="background.paper">
      <Stack spacing={1} p={1}>
        <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={onNewSession}>
          New chat
        </Button>
        <TextField
          size="small"
          placeholder="Search chats"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>
      <Divider />
      {renderSessions()}
    </Stack>
  );
}
