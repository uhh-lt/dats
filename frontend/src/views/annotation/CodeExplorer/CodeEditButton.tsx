import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { CodeRead } from "../../../api/openapi";
import { openCodeEditDialog } from "../../../features/CrudDialog/Code/CodeEditDialog";

function CodeEditButton({ code, ...props }: IconButtonProps & { code: CodeRead }) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    openCodeEditDialog(code);
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
