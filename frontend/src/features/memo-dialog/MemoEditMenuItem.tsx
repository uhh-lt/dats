import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import MemoAPI from "./MemoAPI";
import EditIcon from "@mui/icons-material/Edit";

interface MemoEditMenuItemProps {
  memoId: number | undefined;
  onClick: () => void;
}

function MemoEditMenuItem({ memoId, onClick, ...props }: MemoEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = (event: any) => {
    event.stopPropagation();
    onClick();
    MemoAPI.openMemo({ memoId });
  };

  return (
    <MenuItem onClick={handleClickOpen} disabled={!memoId} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit memo</ListItemText>
    </MenuItem>
  );
}

export default MemoEditMenuItem;
