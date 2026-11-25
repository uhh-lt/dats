import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { memo, useCallback } from "react";
import { MemoHooks } from "./api/memoHooks";

interface MemoDeleteButtonProps {
  memoIds: number[];
}

export const MemoDeleteButton = memo(({ memoIds, ...props }: MemoDeleteButtonProps & IconButtonProps) => {
  const projectId = useParams({ strict: false, select: (params) => params.projectId });
  const { mutate: deleteMemos, isPending } = MemoHooks.useDeleteMemos();

  const openConfirmationDialog = useOpenConfirmationDialog();
  const handleDeleteMemo = useCallback(() => {
    openConfirmationDialog({
      text: `Do you really want to remove the Memo(s) ${memoIds.join(", ")}? This action cannot be undone!`,
      onAccept: () => {
        if (projectId === undefined) return;
        deleteMemos({ projectId, memoIds });
      },
    });
  }, [openConfirmationDialog, memoIds, deleteMemos, projectId]);

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
