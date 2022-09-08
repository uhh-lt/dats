import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import MemoHooks from "../../api/MemoHooks";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";

interface MemoStarButtonProps {
  memoId: number | undefined;
  isStarred: boolean | undefined;
  onClick: () => void;
}

function MemoStarButton({ memoId, isStarred, onClick, ...props }: MemoStarButtonProps & MenuItemProps) {
  // mutation
  const queryClient = useQueryClient();
  const updateMutation = MemoHooks.useUpdateMemo({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      SnackbarAPI.openSnackbar({
        text: `Toggled favorite status of memo ${memoId}`,
        severity: "success",
      });
    },
  });

  // ui events
  const handleClick = (event: React.MouseEvent) => {
    if (memoId === undefined || isStarred === undefined) return;

    event.stopPropagation();
    updateMutation.mutate({
      memoId: memoId,
      requestBody: {
        starred: !isStarred,
      },
    });
    onClick();
  };

  return (
    <MenuItem
      onClick={handleClick}
      disabled={updateMutation.isLoading || memoId === undefined || isStarred === undefined}
      {...props}
    >
      <ListItemIcon>
        <StarIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Mark/unmark memo</ListItemText>
    </MenuItem>
  );
}

export default MemoStarButton;
