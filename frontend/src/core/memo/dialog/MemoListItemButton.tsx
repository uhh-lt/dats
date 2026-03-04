import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";
import { MemoEvent } from "./_types/MemoEvent";
import { useOpenMemoDialog } from "./useOpenMemoDialog";

interface MemoMenuItemProps {
  onClick: (() => void) | undefined;
  content?: React.ReactNode;
}

export const MemoListItemButton = memo(
  ({ memoId, attachedObjectId, attachedObjectType, onClick, content }: MemoEvent & MemoMenuItemProps) => {
    const openMemoDialog = useOpenMemoDialog();
    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        if (onClick) {
          onClick();
        }
        openMemoDialog({ memoId, attachedObjectId, attachedObjectType });
      },
      [memoId, attachedObjectId, attachedObjectType, onClick],
    );

    return (
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick}>
          <ListItemIcon>{getIconComponent(Icon.MEMO, { fontSize: "small" })}</ListItemIcon>
          {content ? <>{content}</> : <ListItemText primary={"Memo"} />}
        </ListItemButton>
      </ListItem>
    );
  },
);
