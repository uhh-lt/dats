import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { memo, useCallback } from "react";
import { FolderRead } from "../../../api/openapi/models/FolderRead";
import { UIDialogActions } from "../../../store/global/dialogSlice";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils";

interface FolderEditMenuItemProps {
  folder: FolderRead;
}

export const FolderEditMenuItem = memo(({ folder, onClick, ...props }: FolderEditMenuItemProps & MenuItemProps) => {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      dispatch(UIDialogActions.openFolderEditDialog({ folder }));
    },
    [dispatch, onClick, folder],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit folder</ListItemText>
    </MenuItem>
  );
});
