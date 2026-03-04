import { MemoHooks } from "@api/hooks/MemoHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";

interface MemoDeleteButtonProps {
  memoIds: number[];
}

export const MemoDeleteButton = memo(({ memoIds, ...props }: MemoDeleteButtonProps & IconButtonProps) => {
  const { mutate: deleteMemos, isPending } = MemoHooks.useDeleteMemos();

  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteMemo = useCallback(() => {
    openConfirmationDialog({
      text: `Do you really want to remove the Memo(s) ${memoIds.join(", ")}? This action cannot be undone!`,
      onAccept: () => {
        deleteMemos({ memoIds: memoIds });
      },
    });
  }, [memoIds, deleteMemos]);

  return (
    <Tooltip title={"Delete"}>
      <span>
        <IconButton onClick={handleDeleteMemo} disabled={isPending} {...props}>
          <DeleteIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
});
