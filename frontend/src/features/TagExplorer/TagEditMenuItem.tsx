import EditIcon from "@mui/icons-material/Edit";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../CrudDialog/dialogSlice.ts";

interface TagEditMenuItemProps {
  tag: DocumentTagRead;
  onClick?: () => void;
}

function TagEditMenuItem({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) {
  const dispatch = useAppDispatch();

  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) onClick();
    dispatch(CRUDDialogActions.openTagEditDialog({ tagId: tag.id }));
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
