import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface TagEditMenuItemProps {
  tag: TagRead;
}

function TagEditMenuItem({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      dispatch(CRUDDialogActions.openTagEditDialog({ tag }));
    },
    [dispatch, onClick, tag],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
}

export default memo(TagEditMenuItem);
