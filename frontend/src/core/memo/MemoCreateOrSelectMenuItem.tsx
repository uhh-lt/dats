import { Icon, getIconComponent } from "@components/icons";
import { CircularProgress, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo } from "react";
import { MemoCreateOrSelectMenu } from "./MemoCreateOrSelectMenu";
import { MemoEvent } from "./dialog/types/MemoEvent";

interface MemoCreateOrSelectMenuItemProps {
  onClick: () => void;
}

export const MemoCreateOrSelectMenuItem = memo(
  ({ attachedObjectId, attachedObjectType, onClick }: MemoEvent & MemoCreateOrSelectMenuItemProps) => {
    if (!attachedObjectId) return null;

    return (
      <MemoCreateOrSelectMenu
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
  },
);
