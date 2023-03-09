import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import MemoAPI, { MemoEvent } from "./MemoAPI";
import EditIcon from "@mui/icons-material/Edit";

interface MemoEditMenuItemProps {
  onClick: () => void;
}

function MemoEditMenuItem({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
  ...props
}: MemoEvent & MemoEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = (event: any) => {
    event.stopPropagation();
    onClick();
    MemoAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
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
