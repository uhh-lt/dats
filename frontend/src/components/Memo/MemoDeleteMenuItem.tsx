import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../features/SnackbarDialog/useOpenSnackbar.ts";
import { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoDeleteMenuItemProps {
  memoTitle?: string;
  onClick: () => void;
}

function MemoDeleteMenuItem({
  memoId,
  memoTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachedObjectId,
  attachedObjectType,
  onClick,
  ...props
}: MemoEvent & MemoDeleteMenuItemProps & MenuItemProps) {
  // snackbar
  const openSnackbar = useOpenSnackbar();
  const deleteMutation = MemoHooks.useDeleteMemo();
  const handleDeleteMemo: React.MouseEventHandler<HTMLLIElement> = (event) => {
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
                openSnackbar({
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
