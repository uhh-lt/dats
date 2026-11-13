import { AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { useAgUiInterrupts } from "@assistant-ui/react-ag-ui";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import { Box, IconButton, Paper, styled, Typography } from "@mui/material";
import { AgentMentionPopover } from "./AgentMentionPopover";

const ComposerInput = styled(ComposerPrimitive.Input)(({ theme }) => ({
  ...theme.typography.body1,
  flex: 1,
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  padding: theme.spacing(1, 1.5),
  minHeight: 40,
  maxHeight: 240,
}));

const roundButtonSx = {
  bgcolor: "primary.main",
  color: "primary.contrastText",
  "&:hover": { bgcolor: "primary.dark" },
  "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
};

/** The prompt input: Enter sends, Shift+Enter adds a line, the stop button cancels a run. */
export function AgentComposer() {
  // the backend holds the run until the pending approvals are answered
  const hasPendingApprovals = useAgUiInterrupts().length > 0;

  return (
    <ComposerPrimitive.TriggerPopoverRoot>
      <ComposerPrimitive.Root>
        <Box sx={{ position: "relative" }}>
          <AgentMentionPopover />
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "flex-end",
              gap: 1,
              p: 1,
              borderRadius: 4,
              transition: "border-color 150ms",
              "&:focus-within": { borderColor: "primary.main" },
            }}
          >
            <ComposerInput
              autoFocus
              rows={1}
              enterKeyHint="send"
              aria-label="Message to the agent"
              disabled={hasPendingApprovals}
              placeholder={
                hasPendingApprovals
                  ? "Approve or deny the pending changes first"
                  : "Ask the agent about this project... (@ mentions documents, codes and tags)"
              }
            />
            <AuiIf condition={(state) => !state.composer.canCancel}>
              <ComposerPrimitive.Send render={<IconButton size="small" aria-label="Send" sx={roundButtonSx} />}>
                <ArrowUpwardIcon fontSize="small" />
              </ComposerPrimitive.Send>
            </AuiIf>
            <AuiIf condition={(state) => state.composer.canCancel}>
              <ComposerPrimitive.Cancel render={<IconButton size="small" aria-label="Stop" sx={roundButtonSx} />}>
                <StopRoundedIcon fontSize="small" />
              </ComposerPrimitive.Cancel>
            </AuiIf>
          </Paper>
        </Box>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, textAlign: "center" }}>
          Enter sends, Shift+Enter adds a line. The agent can make mistakes; check important results.
        </Typography>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.TriggerPopoverRoot>
  );
}
