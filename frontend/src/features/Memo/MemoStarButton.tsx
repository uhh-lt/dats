import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import React from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import SnackbarAPI from "../Snackbar/SnackbarAPI.ts";

interface MemoStarButtonProps {
  memoId: number;
  isStarred: boolean;
}

function MemoStarButton({ memoId, isStarred, ...props }: MemoStarButtonProps & IconButtonProps) {
  // mutation
  const updateMutation = MemoHooks.useUpdateMemo();

  // ui events
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateMutation.mutate(
      {
        memoId: memoId,
        requestBody: {
          starred: !isStarred,
        },
      },
      {
        onSuccess: (memo) => {
          SnackbarAPI.openSnackbar({
            text: `Toggled favorite status of memo ${memo.id}`,
            severity: "success",
          });
        },
      },
    );
  };

  return (
    <Tooltip title={isStarred ? "Marked" : "Not marked"}>
      <span>
        <IconButton onClick={handleClick} disabled={updateMutation.isPending} {...props}>
          {isStarred ? <StarIcon /> : <StarOutlineIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoStarButton;
