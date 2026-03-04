import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

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
    const openMemoDialog = useOpenMemoDialog();
    const handleClickOpen = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        onClick();
        openMemoDialog({ memoId, attachedObjectId, attachedObjectType });
      },
      [onClick, openMemoDialog, memoId, attachedObjectId, attachedObjectType],
    );

    return (
      <MenuItem onClick={handleClickOpen} disabled={!memoId} {...props}>
        <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
        <ListItemText>Edit memo</ListItemText>
      </MenuItem>
    );
  },
);
