import { Icon, getIconComponent } from "@components/icons";
import { Button, ButtonProps } from "@mui/material";
import { memo, useCallback } from "react";
import { MemoEvent, useOpenMemoDialog } from "../dialog";

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
    memoId,
    attachedObjectType,
    attachedObjectId,
    onCreateSuccess,
    ...props
  }: MemoIndicatorProps & MemoEvent & ButtonProps) => {
    const openMemoDialog = useOpenMemoDialog();

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        openMemoDialog({ memoId, attachedObjectType, attachedObjectId, onCreateSuccess });
      },
      [openMemoDialog, memoId, attachedObjectType, attachedObjectId, onCreateSuccess],
    );

    if (memoIds.length === 0) {
      return null;
    }

    return (
      <Button
        component="span"
        size="small"
        color="inherit"
        onClick={handleClick}
        startIcon={getIconComponent(Icon.MEMO_ALT)}
        sx={{ minWidth: 0, "& .MuiButton-startIcon": { mr: 0.5 } }}
        {...props}
      >
        {memoIds.length}
      </Button>
    );
  },
);
