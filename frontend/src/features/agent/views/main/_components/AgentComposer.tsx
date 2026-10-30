import { AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { useAgUiInterrupts } from "@assistant-ui/react-ag-ui";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import { IconButton, Paper, styled } from "@mui/material";

const ComposerInput = styled(ComposerPrimitive.Input)(({ theme }) => ({
  ...theme.typography.body1,
  flex: 1,
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: theme.spacing(1),
  maxHeight: 200,
}));

/** The prompt input: Enter sends, Shift+Enter adds a line, the stop button cancels a run. */
export function AgentComposer() {
  // the backend holds the run until the pending approvals are answered
  const hasPendingApprovals = useAgUiInterrupts().length > 0;

  return (
    <ComposerPrimitive.Root asChild>
      <Paper component="form" variant="outlined" sx={{ display: "flex", alignItems: "flex-end", mx: 2, mb: 2, p: 0.5 }}>
        <ComposerInput
          autoFocus
          rows={1}
          disabled={hasPendingApprovals}
          placeholder={
            hasPendingApprovals ? "Approve or deny the pending changes first" : "Ask the agent about this project..."
          }
        />
        <AuiIf condition={(state) => !state.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <IconButton color="primary" aria-label="Send">
              <SendIcon />
            </IconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(state) => state.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <IconButton color="primary" aria-label="Stop">
              <StopIcon />
            </IconButton>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </Paper>
    </ComposerPrimitive.Root>
  );
}
