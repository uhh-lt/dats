import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import { DocumentTagRead } from "../../api/openapi";
import { openTagEditDialog } from "../CrudDialog/Tag/TagEditDialog";

interface TagEditMenuItemProps {
  tag: DocumentTagRead;
  onClick?: () => void;
}

function TagEditMenuItem({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) onClick();
    openTagEditDialog(tag.id);
  };

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
}

export default TagEditMenuItem;
