import { Icon, getIconComponent } from "@components/icons";
import { CircularProgress, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo } from "react";
import { AttachedMemoMenu } from "./AttachedMemoMenu";
import { MemoEvent } from "./types/MemoEvent";

interface MemoMenuItemProps {
  onClick: () => void;
}

export const MemoMenuItem = memo(({ attachedObjectId, attachedObjectType, onClick }: MemoEvent & MemoMenuItemProps) => {
  if (!attachedObjectId) return null;

  return (
    <AttachedMemoMenu
      attachedObjectId={attachedObjectId}
      attachedObjectType={attachedObjectType}
      onAction={onClick}
      menuPlacement="right"
      renderTrigger={(handleClick, isFetching) => (
        <MenuItem onClick={handleClick} disabled={isFetching}>
          <ListItemIcon>
            {isFetching ? <CircularProgress size={20} /> : getIconComponent(Icon.MEMO, { fontSize: "small" })}
          </ListItemIcon>
          <ListItemText>Memos</ListItemText>
        </MenuItem>
      )}
    />
  );
});
