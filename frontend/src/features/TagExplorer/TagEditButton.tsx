import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../CrudDialog/dialogSlice.ts";

function TagEditButton({ tag, ...props }: IconButtonProps & { tag: DocumentTagRead }) {
  const dispatch = useAppDispatch();

  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    dispatch(CRUDDialogActions.openTagEditDialog({ tagId: tag.id }));
  };

  return (
    <Tooltip title="Edit tag">
      <span>
        <IconButton onClick={handleClickOpen} {...props}>
          <EditIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default TagEditButton;
