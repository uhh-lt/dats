import { TagRead } from "@api/models/TagRead";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";

interface TagEditMenuItemProps {
  tag: TagRead;
}

export const TagEditMenuItem = memo(({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) => {
  const openTagEditDialog = useOpenDialog("tagEdit");

  const handleClickOpen = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      openTagEditDialog({ tag });
    },
    [openTagEditDialog, onClick, tag],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
});
