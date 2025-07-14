import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import MemoDialogAPI, { MemoEvent } from "./MemoDialog/MemoDialogAPI.ts";

interface MemoEditMenuItemProps {
  onClick: () => void;
}

function MemoEditMenuItem({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
  ...props
}: MemoEvent & MemoEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      onClick();
      MemoDialogAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
    },
    [memoId, attachedObjectId, attachedObjectType, onClick],
  );

  return (
    <MenuItem onClick={handleClickOpen} disabled={!memoId} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit memo</ListItemText>
    </MenuItem>
  );
}

export default memo(MemoEditMenuItem);
