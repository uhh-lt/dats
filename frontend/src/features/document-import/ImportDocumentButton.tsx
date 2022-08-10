import { IconButton } from "@mui/material";
import React from "react";
import InboxIcon from "@mui/icons-material/MoveToInbox";
import eventBus from "../../EventBus";

export default function ImportDocumentButton() {
  const handleClickOpen = () => {
    eventBus.dispatch("onOpenImportDocumentDialog", "Hello World!");
  };

  return (
    <IconButton onClick={handleClickOpen}>
      <InboxIcon />
    </IconButton>
  );
}
