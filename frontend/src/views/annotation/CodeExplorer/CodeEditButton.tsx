import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

function CodeEditButton({ code, ...props }: IconButtonProps & { code: CodeRead }) {
  const dispatch = useAppDispatch();

  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    dispatch(CRUDDialogActions.openCodeEditDialog({ code }));
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
