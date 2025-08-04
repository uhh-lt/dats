import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, useCallback } from "react";
import { FolderRead } from "../../../api/openapi/models/FolderRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface FolderEditMenuItemProps {
  folder: FolderRead;
}

function FolderEditMenuItem({ folder, onClick, ...props }: FolderEditMenuItemProps & MenuItemProps) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      dispatch(CRUDDialogActions.openFolderEditDialog({ folder }));
    },
    [dispatch, onClick, folder],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit folder</ListItemText>
    </MenuItem>
  );
}

export default memo(FolderEditMenuItem);
