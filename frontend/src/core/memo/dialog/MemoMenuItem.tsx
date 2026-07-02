import { Icon, getIconComponent } from "@components/icons";
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo, useCallback } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

interface MemoMenuItemProps {
  onClick: React.MouseEventHandler<HTMLLIElement>;
}

export const MemoMenuItem = memo(
  ({ memoId, attachedObjectId, attachedObjectType, onClick }: MemoEvent & MemoMenuItemProps) => {
    const openMemoDialog = useOpenMemoDialog();
    const handleClickOpen = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        onClick(event);
        openMemoDialog({ memoId, attachedObjectId, attachedObjectType });
      },
      [onClick, openMemoDialog, memoId, attachedObjectId, attachedObjectType],
    );

    return (
      <MenuItem onClick={handleClickOpen}>
        <ListItemIcon>{getIconComponent(Icon.MEMO, { fontSize: "small" })}</ListItemIcon>
        <ListItemText>Memo</ListItemText>
      </MenuItem>
    );
  },
);
