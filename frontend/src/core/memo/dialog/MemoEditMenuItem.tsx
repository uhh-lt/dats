import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { MemoDialogAPI } from "./MemoDialogAPI.ts";
import { MemoEvent } from "./MemoEvent.ts";

interface MemoEditMenuItemProps {
  onClick: () => void;
}

export const MemoEditMenuItem = memo(
  ({
    memoId,
    attachedObjectId,
    attachedObjectType,
    onClick,
    ...props
  }: MemoEvent & MemoEditMenuItemProps & MenuItemProps) => {
    const handleClickOpen = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        onClick();
        MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
      },
      [memoId, attachedObjectId, attachedObjectType, onClick],
    );

    return (
      <MenuItem onClick={handleClickOpen} disabled={!memoId} {...props}>
        <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
        <ListItemText>Edit memo</ListItemText>
      </MenuItem>
    );
  },
);
