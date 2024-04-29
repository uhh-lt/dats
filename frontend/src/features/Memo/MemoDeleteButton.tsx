import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import MemoHooks from "../../api/MemoHooks";
import { MemoRead } from "../../api/openapi";

interface MemoDeleteButtonProps {
  memo: MemoRead;
}

function MemoDeleteButton({ memo, ...props }: MemoDeleteButtonProps & IconButtonProps) {
  const deleteMutation = MemoHooks.useDeleteMemo();
  const handleDeleteMemo = () => {
    if (memo) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the Memo "${memo.title}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memo.id },
            {
              onSuccess: () => {
                SnackbarAPI.openSnackbar({
                  text: `Deleted memo ${memo.title}`,
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
    <Tooltip title={"Edit memo"}>
      <span>
        <IconButton onClick={handleDeleteMemo} size={"small"} disableRipple>
          <DeleteIcon /> <Typography variant="body1">Delete Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoDeleteButton;
