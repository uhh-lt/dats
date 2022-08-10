import { ListItem, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import eventBus from "../../EventBus";

export default function ImportDocumentListButton() {
  const handleClickOpen = () => {
    eventBus.dispatch("onOpenImportDocumentDialog", "Hello World!");
  };

  return (
    <ListItem button onClick={handleClickOpen}>
      <ListItemIcon>
        <InboxIcon />
      </ListItemIcon>
      <ListItemText primary="Import document" />
    </ListItem>
  );
}
