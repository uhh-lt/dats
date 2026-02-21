import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { MemoDialogAPI } from "./MemoDialogAPI.ts";
import { MemoEvent } from "./MemoEvent.ts";

interface MemoMenuItemProps {
  onClick: React.MouseEventHandler<HTMLLIElement>;
}

export const MemoMenuItem = memo(
  ({ memoId, attachedObjectId, attachedObjectType, onClick }: MemoEvent & MemoMenuItemProps) => {
    const handleClickOpen = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();
        onClick(event);
        MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
      },
      [memoId, attachedObjectId, attachedObjectType, onClick],
    );

    return (
      <MenuItem onClick={handleClickOpen}>
        <ListItemIcon>{getIconComponent(Icon.MEMO, { fontSize: "small" })}</ListItemIcon>
        <ListItemText>Memo</ListItemText>
      </MenuItem>
    );
  },
);
