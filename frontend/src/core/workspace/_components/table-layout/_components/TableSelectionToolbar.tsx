import ClearIcon from "@mui/icons-material/Clear";
import { Divider, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { ReactNode } from "react";

interface TableSelectionToolbarProps {
  selectedIds: number[];
  onClear: () => void;
  /** Entity-specific bulk actions (favorite, delete, ...). */
  actions?: ReactNode;
}

/**
 * Toolbar shown above the TABLE layout while rows are selected. Displays the selection count, a
 * clear-selection button, and entity-specific bulk actions.
 */
export function TableSelectionToolbar({ selectedIds, onClear, actions }: TableSelectionToolbarProps): ReactNode {
  return (
    <Toolbar variant="dense" disableGutters sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
        <Typography color="primary">{selectedIds.length} selected</Typography>
        <IconButton size="small" onClick={onClear} aria-label="Clear selection">
          <ClearIcon fontSize="small" />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        {actions}
      </Stack>
    </Toolbar>
  );
}
