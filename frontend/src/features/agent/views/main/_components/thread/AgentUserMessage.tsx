import { ActionBarPrimitive, ComposerPrimitive, MessagePrimitive } from "@assistant-ui/react";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { Button, Paper, Stack, styled } from "@mui/material";
import { AgentBranchPicker } from "./AgentBranchPicker";
import { AgentIconButton } from "./AgentIconButton";

const EditInput = styled(ComposerPrimitive.Input)(({ theme }) => ({
  ...theme.typography.body1,
  width: "100%",
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: theme.spacing(1.5, 2, 0.5),
}));

/** A prompt of the user, right-aligned; hovering shows the edit button. */
export function AgentUserMessage() {
  return (
    <MessagePrimitive.Root>
      <Stack alignItems="flex-end" sx={{ mt: 3 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} maxWidth="85%">
          <ActionBarPrimitive.Root hideWhenRunning autohide="not-last">
            <ActionBarPrimitive.Edit render={<AgentIconButton tooltip="Edit" />}>
              <EditOutlinedIcon fontSize="small" />
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "grey.100",
              borderRadius: 3,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            <MessagePrimitive.Parts>{({ part }) => (part.type === "text" ? part.text : null)}</MessagePrimitive.Parts>
          </Paper>
        </Stack>
        <AgentBranchPicker />
      </Stack>
    </MessagePrimitive.Root>
  );
}

/** Editing a prompt: sending it starts a new version of the conversation from there. */
export function AgentEditComposer() {
  return (
    <MessagePrimitive.Root>
      <ComposerPrimitive.Root>
        <Paper variant="outlined" sx={{ ml: "auto", maxWidth: "85%", borderRadius: 3 }}>
          <EditInput autoFocus />
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 1 }}>
            <ComposerPrimitive.Cancel render={<Button size="small" />}>Cancel</ComposerPrimitive.Cancel>
            <ComposerPrimitive.Send render={<Button size="small" variant="contained" />}>Update</ComposerPrimitive.Send>
          </Stack>
        </Paper>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}
