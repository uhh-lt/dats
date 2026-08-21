import { Icon, getIconComponent } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CircularProgress, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { memo } from "react";
import { MemoCreateOrSelectMenu } from "./MemoCreateOrSelectMenu";

interface MemoCreateOrSelectMenuItemProps {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  onClick: () => void;
}

export const MemoCreateOrSelectMenuItem = memo(
  ({ attachedObjectId, attachedObjectType, onClick }: MemoCreateOrSelectMenuItemProps) => {
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
