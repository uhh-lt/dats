import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
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
    <Tooltip title="Edit code">
      <span>
        <IconButton onClick={handleClickOpen} {...props}>
          <EditIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default CodeEditButton;
