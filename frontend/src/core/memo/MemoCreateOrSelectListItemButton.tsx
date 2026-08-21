import { Icon, getIconComponent } from "@components/icons";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CircularProgress, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { memo } from "react";
import { MemoCreateOrSelectMenu } from "./MemoCreateOrSelectMenu";

interface MemoCreateOrSelectListItemButtonProps {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  onClick: (() => void) | undefined;
  content?: React.ReactNode;
}

export const MemoCreateOrSelectListItemButton = memo(
  ({ attachedObjectId, attachedObjectType, onClick, content }: MemoCreateOrSelectListItemButtonProps) => {
    return (
      <MemoCreateOrSelectMenu
        attachedObjectId={attachedObjectId}
        attachedObjectType={attachedObjectType}
        onAction={onClick}
        menuPlacement="right"
        renderTrigger={(handleClick, isFetching) => (
          <ListItem disablePadding>
            <ListItemButton onClick={handleClick} disabled={isFetching}>
              <ListItemIcon>
                {isFetching ? <CircularProgress size={20} /> : getIconComponent(Icon.MEMO, { fontSize: "small" })}
              </ListItemIcon>
              {content ? <>{content}</> : <ListItemText primary="Memos" />}
            </ListItemButton>
          </ListItem>
        )}
      />
    );
  },
);
