import { FolderRead } from "@api/models/FolderRead";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";

interface FolderEditMenuItemProps {
  folder: FolderRead;
}

export const FolderEditMenuItem = memo(({ folder, onClick, ...props }: FolderEditMenuItemProps & MenuItemProps) => {
  const openFolderEditDialog = useOpenDialog("folderEdit");

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      openFolderEditDialog({ folder });
    },
    [openFolderEditDialog, onClick, folder],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit folder</ListItemText>
    </MenuItem>
  );
});
