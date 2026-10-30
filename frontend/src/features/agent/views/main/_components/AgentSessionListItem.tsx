import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, ListItem, ListItemButton, ListItemText, Stack, TextField, Tooltip } from "@mui/material";
import { AgentSessionRead } from "@models/AgentSessionRead";
import { KeyboardEvent, memo, useState } from "react";
import { AgentHooks } from "../../../api/agentHooks";

interface AgentSessionListItemProps {
  session: AgentSessionRead;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (session: AgentSessionRead) => void;
}

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
        />
      </ListItem>
    );
  }

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Stack direction="row">
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
      }
      sx={{ "& .MuiListItemButton-root": { pr: 10 } }}
    >
      <ListItemButton selected={isActive} onClick={() => onSelect(session.session_id)}>
        <ListItemText
          primary={session.title || "Untitled chat"}
          secondary={new Date(session.updated).toLocaleString()}
          primaryTypographyProps={{ noWrap: true }}
        />
      </ListItemButton>
    </ListItem>
  );
});
