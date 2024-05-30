import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import SnackbarAPI from "../../features/SnackbarDialog/SnackbarAPI.ts";

interface MemoStarButtonProps {
  memoId: number | undefined;
  isStarred: boolean | undefined;
  onClick?: () => void;
}

function MemoStarButton({ memoId, isStarred, onClick, ...props }: MemoStarButtonProps & MenuItemProps) {
  // mutation
  const updateMutation = MemoHooks.useUpdateMemo();

  // ui events
  const handleClick = (event: React.MouseEvent) => {
    if (memoId === undefined || isStarred === undefined) return;

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
    if (onClick) {
      onClick();
    }
  };

  return (
    <MenuItem
      onClick={handleClick}
      disabled={updateMutation.isPending || memoId === undefined || isStarred === undefined}
      {...props}
    >
      <ListItemIcon>{isStarred ? <StarIcon fontSize="small" /> : <StarOutlineIcon fontSize="small" />}</ListItemIcon>
      <ListItemText>Mark/unmark memo</ListItemText>
    </MenuItem>
  );
}

export default MemoStarButton;
