import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import SettingsIcon from "@mui/icons-material/Settings";

function TagManageButton(props: ListItemButtonProps) {
  return (
    <ListItemButton onClick={() => console.log("Manage!")} {...props} disabled>
      <ListItemIcon>
        <SettingsIcon />
      </ListItemIcon>
      <ListItemText primary="Manage labels" />
    </ListItemButton>
  );
}

export default TagManageButton;
