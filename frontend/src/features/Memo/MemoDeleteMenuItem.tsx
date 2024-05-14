import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { MemoEvent } from "./MemoAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import MemoHooks from "../../api/MemoHooks";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI";

interface MemoDeleteMenuItemProps {
  memoTitle?: string;
  onClick: () => void;
}

function MemoDeleteMenuItem({
  memoId,
  memoTitle,
  attachedObjectId,
  attachedObjectType,
  onClick,
  ...props
}: MemoEvent & MemoDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = MemoHooks.useDeleteMemo();
  const handleDeleteMemo = (event: any) => {
    event.stopPropagation();
    onClick();
    if (memoId) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the Memo "${memoTitle}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memoId },
            {
              onSuccess: () => {
                SnackbarAPI.openSnackbar({
                  text: `Deleted memo attached to ${attachedObjectType}`,
                  severity: "success",
                });
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
    }
  };

  return (
    <MenuItem onClick={handleDeleteMemo} disabled={!memoId} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete Memo</ListItemText>
    </MenuItem>
  );
}

export default MemoDeleteMenuItem;
