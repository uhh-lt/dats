import { Icon, getIconComponent } from "@components/icons";
import { CircularProgress, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { memo } from "react";
import { AttachedMemoMenu } from "./AttachedMemoMenu";
import { MemoEvent } from "./types/MemoEvent";

interface MemoMenuItemProps {
  onClick: (() => void) | undefined;
  content?: React.ReactNode;
}

export const MemoListItemButton = memo(
  ({ attachedObjectId, attachedObjectType, onClick, content }: MemoEvent & MemoMenuItemProps) => {
    if (!attachedObjectId) return null;

    return (
      <AttachedMemoMenu
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
