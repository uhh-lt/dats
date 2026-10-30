import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, ListItem, ListItemButton, ListItemText, Stack, TextField, Tooltip } from "@mui/material";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { KeyboardEvent, memo, useState } from "react";
import { AGENT_LABELS } from "../../../_utils/agentLabelUtils";
import { AgentHooks } from "../../../api/agentHooks";
import { formatSessionTime } from "../_utils/agentSessionUtils";
import { ShimmerText } from "./thread/ShimmerText";

interface AgentSessionListItemProps {
  session: AgentSessionRead;
  isActive: boolean;
  onSelect: (session: AgentSessionRead) => void;
  onDelete: (session: AgentSessionRead) => void;
}

/** One chat: its title (shimmering while it is generated), agent and time; rename and delete on hover. */
export const AgentSessionListItem = memo(({ session, isActive, onSelect, onDelete }: AgentSessionListItemProps) => {
  const [editedTitle, setEditedTitle] = useState<string | undefined>(undefined);
  const renameSession = AgentHooks.useRenameSession();

  const handleRenameStart = () => setEditedTitle(session.title ?? "");
  const handleRenameSubmit = () => {
    const title = editedTitle?.trim();
    setEditedTitle(undefined);
    if (!title || title === session.title) return;
    renameSession.mutate({ sessionId: session.session_id, title });
  };
  const handleRenameKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") handleRenameSubmit();
    if (event.key === "Escape") setEditedTitle(undefined);
  };

  if (editedTitle !== undefined) {
    return (
      <ListItem>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={editedTitle}
          onChange={(event) => setEditedTitle(event.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          slotProps={{ htmlInput: { "aria-label": "Chat title" } }}
        />
      </ListItem>
    );
  }

  // a chat whose first run still runs has no title yet (see useAgentRuntime)
  const isNew = session.title === null || session.title === undefined;
  return (
    <ListItem
      disablePadding
      secondaryAction={
        !isNew && (
          <Stack direction="row" className="session-actions" sx={{ opacity: 0, transition: "opacity 150ms" }}>
            <Tooltip title="Rename chat">
              <IconButton size="small" onClick={handleRenameStart}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete chat">
              <IconButton size="small" onClick={() => onDelete(session)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
      sx={{
        "&:hover .session-actions, &:focus-within .session-actions": { opacity: 1 },
        "&:hover .MuiListItemButton-root, &:focus-within .MuiListItemButton-root": { pr: 10 },
      }}
    >
      <ListItemButton selected={isActive} onClick={() => onSelect(session)}>
        <ListItemText
          primary={isNew ? <ShimmerText variant="body2">New chat</ShimmerText> : session.title}
          secondary={`${AGENT_LABELS[session.agent_name]} · ${formatSessionTime(session.updated, new Date())}`}
          primaryTypographyProps={{ noWrap: true }}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </ListItemButton>
    </ListItem>
  );
});
