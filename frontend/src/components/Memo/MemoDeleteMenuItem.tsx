import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoDeleteMenuItemProps {
  memoTitle?: string;
  onClick: () => void;
  onDelete?: () => void;
}

function MemoDeleteMenuItem({
  memoId,
  memoTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachedObjectId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachedObjectType,
  onClick,
  ...props
}: MemoEvent & MemoDeleteMenuItemProps & MenuItemProps) {
  const { mutate: deleteMemo } = MemoHooks.useDeleteMemo();

  const handleDeleteMemo = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (memoId) {
        ConfirmationAPI.openConfirmationDialog({
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
    [memoId, memoTitle, deleteMemo, onClick],
  );

  return (
    <MenuItem onClick={handleDeleteMemo} disabled={!memoId} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete Memo</ListItemText>
    </MenuItem>
  );
}

export default memo(MemoDeleteMenuItem);
