import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import MemoHooks from "../../api/MemoHooks";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";

interface MemoStarButtonProps {
  memoId: number;
  isStarred: boolean;
}

function MemoStarButton({ memoId, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) {
  // mutation
  const queryClient = useQueryClient();
  const updateMutation = MemoHooks.useUpdateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      SnackbarAPI.openSnackbar({
        text: `Toggled favorite status of memo ${memoId}`,
        severity: "success",
      });
    },
  });

  // ui events
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateMutation.mutate({
      memoId: memoId,
      requestBody: {
        starred: !isStarred,
      },
    });
  };

  return (
    <Tooltip title={isStarred ? "Marked" : "Not marked"}>
      <span>
        <IconButton onClick={handleClick} disabled={updateMutation.isLoading} {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoStarButton;
