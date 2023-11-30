import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { DocumentTagRead } from "../../api/openapi";
import { openTagEditDialog } from "../CrudDialog/Tag/TagEditDialog";

function TagEditButton({ tag, ...props }: IconButtonProps & { tag: DocumentTagRead }) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    openTagEditDialog(tag.id);
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
