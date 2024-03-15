import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import { CodeRead, DocumentTagRead } from "../../api/openapi";
import { openTreeDataEditDialog } from "../CrudDialog/TreeData/TreeDataEditDialog";

function DataEditButton({ data, ...props }: IconButtonProps & { data: DocumentTagRead | CodeRead }) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    openTreeDataEditDialog({ data: data, dataId: data.id });
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

export default DataEditButton;
