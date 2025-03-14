import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import React from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoMenuItemProps {
  onClick: React.MouseEventHandler<HTMLLIElement>;
}

export default function MemoMenuItem({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
}: MemoEvent & MemoMenuItemProps) {
  const handleClickOpen: React.MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();
    onClick(event);
    MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
  };

  return (
    <MenuItem onClick={handleClickOpen}>
      <ListItemIcon>{getIconComponent(Icon.MEMO, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Memo</ListItemText>
    </MenuItem>
  );
}
