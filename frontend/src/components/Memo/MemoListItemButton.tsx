import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoMenuItemProps {
  onClick: (() => void) | undefined;
  content?: React.ReactNode;
}

function MemoListItemButton({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
  content,
}: MemoEvent & MemoMenuItemProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (onClick) {
        onClick();
      }
      MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
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
}

export default memo(MemoListItemButton);
