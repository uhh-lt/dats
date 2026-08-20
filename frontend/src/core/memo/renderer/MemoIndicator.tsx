import { Icon, getIconComponent } from "@components/icons";
import { Button, ButtonProps, CircularProgress } from "@mui/material";
import { memo } from "react";
import { AttachedMemoMenu, MemoEvent } from "../dialog";

interface MemoIndicatorProps {
  /**
   * A list of memo IDs associated with the attached object.
   * When empty, nothing is rendered.
   */
  memoIds: number[];
  /**
   * Tooltip text. Defaults to "Has memo — click to open".
   */
  tooltip?: string;
}

/**
 * A small, clickable indicator showing that an object has a memo.
 * Renders nothing when `memoIds` is empty. Clicking opens the global MemoDialog.
 *
 * This is the shared visual building block for memo indicators across all surfaces
 * (annotation cards, explorer trees, search tables, document viewers, ...).
 */
export const MemoIndicator = memo(
  ({
    memoIds,
    attachedObjectType,
    attachedObjectId,
    onCreateSuccess,
    ...props
  }: MemoIndicatorProps & MemoEvent & ButtonProps) => {
    if (memoIds.length === 0 || !attachedObjectId) {
      return null;
    }

    return (
      <AttachedMemoMenu
        attachedObjectType={attachedObjectType}
        attachedObjectId={attachedObjectId}
        onCreateSuccess={onCreateSuccess}
        renderTrigger={(handleClick, isFetching) => (
          <Button
            component="span"
            size="small"
            color="inherit"
            onClick={handleClick}
            disabled={isFetching}
            startIcon={isFetching ? <CircularProgress size={16} /> : getIconComponent(Icon.MEMO_ALT)}
            sx={{ minWidth: 0, "& .MuiButton-startIcon": { mr: 0.5 } }}
            {...props}
          >
            {memoIds.length}
          </Button>
        )}
      />
    );
  },
);
