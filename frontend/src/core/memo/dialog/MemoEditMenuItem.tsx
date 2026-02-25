import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils";
import { MemoEvent } from "./_types/MemoEvent";

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
        openMemoDialog({ memoId, attachedObjectId, attachedObjectType });
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
