import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";

interface MemoDeleteButtonProps {
  memoIds: number[];
}

function MemoDeleteButton({ memoIds, ...props }: MemoDeleteButtonProps & IconButtonProps) {
  // snackbar
  const deleteMutation = MemoHooks.useDeleteMemos();
  const handleDeleteMemo = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the Memo(s) ${memoIds.join(", ")}? This action cannot be undone!`,
      onAccept: () => {
        deleteMutation.mutate({ memoIds: memoIds });
      },
    });
  };

  return (
    <Tooltip title={"Delete"}>
      <span>
        <IconButton onClick={handleDeleteMemo} disabled={deleteMutation.isPending} {...props}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoDeleteButton;
