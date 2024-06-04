import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";

interface MemoDeleteButtonProps {
  memoId: number;
  memoTitle?: string;
}

function MemoDeleteButton({ memoId, memoTitle, ...props }: MemoDeleteButtonProps & IconButtonProps) {
  // snackbar
  const openSnackbar = useOpenSnackbar();
  const deleteMutation = MemoHooks.useDeleteMemo();
  const handleDeleteMemo = () => {
    if (memoId) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the Memo "${memoTitle}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memoId },
            {
              onSuccess: () => {
                openSnackbar({
                  text: `Deleted memo ${memoTitle}`,
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
    <Tooltip title={"Delete memo"}>
      <span>
        <IconButton onClick={handleDeleteMemo} size={"small"} disableRipple {...props}>
          <DeleteIcon /> <Typography variant="body1">Delete Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoDeleteButton;
