import { MemoHooks } from "@api/hooks/MemoHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoDeleteMenuItemProps {
  memoId?: number;
  memoTitle?: string;
  onClick: () => void;
  onDelete?: () => void;
}

export const MemoDeleteMenuItem = memo(
  ({ memoId, memoTitle, onClick, ...props }: MemoDeleteMenuItemProps & MenuItemProps) => {
    const { mutate: deleteMemo } = MemoHooks.useDeleteMemo();

    const openConfirmationDialog = useOpenConfirmationDialog();
    const handleDeleteMemo = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        if (memoId) {
          openConfirmationDialog({
            text: `Do you really want to remove the Memo "${memoTitle}"? This action cannot be undone!`,
            onAccept: () => {
              deleteMemo(
                { memoId: memoId },
                {
                  onSuccess: () => {
                    onClick();
                  },
                },
              );
            },
          });
        } else {
          throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
        }
      },
      [memoId, openConfirmationDialog, memoTitle, deleteMemo, onClick],
    );

    return (
      <MenuItem onClick={handleDeleteMemo} disabled={!memoId} {...props}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete Memo</ListItemText>
      </MenuItem>
    );
  },
);
