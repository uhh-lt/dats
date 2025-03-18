import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface TagEditMenuItemProps {
  tag: DocumentTagRead;
}

function TagEditMenuItem({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      dispatch(CRUDDialogActions.openTagEditDialog({ tagId: tag.id }));
    },
    [dispatch, onClick, tag.id],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
}

export default memo(TagEditMenuItem);
