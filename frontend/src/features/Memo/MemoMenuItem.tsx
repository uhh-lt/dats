import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import React from "react";
import CommentIcon from "@mui/icons-material/Comment";
import MemoAPI, { MemoEvent } from "./MemoAPI.ts";

interface MemoMenuItemProps {
  onClick: () => void;
}

export default function MemoMenuItem({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
}: MemoEvent & MemoMenuItemProps) {
  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick();
    MemoAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
  };

  return (
    <MenuItem onClick={handleClickOpen}>
      <ListItemIcon>
        <CommentIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Memo</ListItemText>
    </MenuItem>
  );
}
