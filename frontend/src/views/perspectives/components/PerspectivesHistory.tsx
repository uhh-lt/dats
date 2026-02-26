import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";

interface PerspectivesHistoryProps {
  aspectId: number;
}

const formatActionName = (action: string) => {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function PerspectivesHistory({ aspectId }: PerspectivesHistoryProps) {
  const history = PerspectivesHooks.useGetHistory(aspectId);

  // Sort history by history_number
  const sortedHistory = useMemo(() => {
    if (!history.data) return [];
    return [...history.data].sort((a, b) => a.history_number - b.history_number);
  }, [history.data]);

  // Find the last applied action (not undone)
  // If all are undone, index is -1.
  const lastAppliedIndex = sortedHistory.findLastIndex((h) => !h.is_undone);

  const undoMutation = PerspectivesHooks.useUndo();
  const handleUndo = () => {
    undoMutation.mutate({ aspectId });
  };

  const redoMutation = PerspectivesHooks.useRedo();
  const handleRedo = () => {
    redoMutation.mutate({ aspectId });
  };

  // Undo is possible if there is at least one applied action.
  const canUndo = lastAppliedIndex >= 0;

  // Redo is possible if there is at least one undone action after the last applied action.
  // If lastAppliedIndex is the last element, we can't redo.
  // If lastAppliedIndex is -1, we can redo if there are any elements (which would be undone).
  const canRedo = lastAppliedIndex < sortedHistory.length - 1;

  if (history.isLoading) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <Stack direction="row" spacing={1}>
        <Tooltip title="Undo">
          <span>
            <IconButton onClick={handleUndo} loading={undoMutation.isPending} disabled={!canUndo}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton onClick={handleRedo} loading={redoMutation.isPending} disabled={!canRedo}>
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ overflowX: "auto", flex: 1, pb: 0.5 }}>
        {sortedHistory.map((entry, index) => {
          const isUndone = entry.is_undone;
          const isCurrent = index === lastAppliedIndex;

          return (
            <Box
              key={entry.id}
              sx={{
                p: 1,
                px: 2,
                borderRadius: 1,
                bgcolor: isCurrent ? "primary.light" : "background.paper",
                color: isUndone ? "text.disabled" : isCurrent ? "primary.contrastText" : "text.primary",
                border: 1,
                borderColor: isCurrent ? "primary.main" : "divider",
                opacity: isUndone ? 0.6 : 1,
                whiteSpace: "nowrap",
                minWidth: "fit-content",
                boxShadow: isCurrent ? 2 : 0,
                fontWeight: isCurrent ? "bold" : "normal",
              }}
            >
              <Typography variant="body2" fontWeight="inherit">
                {formatActionName(entry.perspectives_action)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

export default PerspectivesHistory;
