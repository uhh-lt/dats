import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import eventBus from "../../../EventBus";
import { CodeRead } from "../../../api/openapi";

function CodeEditButton({ code, ...props }: IconButtonProps & { code: CodeRead }) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    eventBus.dispatch("open-edit-code", code);
  };

  return (
    <IconButton onClick={handleClickOpen} {...props}>
      <EditIcon />
    </IconButton>
  );
}

export default CodeEditButton;
