import EditIcon from "@mui/icons-material/Edit";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import eventBus from "../../../EventBus.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";

interface CodeEditMenuItemProps {
  code: CodeRead;
  onClick?: () => void;
}

function CodeEditMenuItem({ code, onClick, ...props }: CodeEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) onClick();
    eventBus.dispatch("open-edit-code", code);
  };

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit code</ListItemText>
    </MenuItem>
  );
}

export default CodeEditMenuItem;
