import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

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
  const handleClickOpen: React.MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();
    onClick();
    MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
  };

  return (
    <MenuItem onClick={handleClickOpen} disabled={!memoId} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit memo</ListItemText>
    </MenuItem>
  );
}

export default MemoEditMenuItem;
