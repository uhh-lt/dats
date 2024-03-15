import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import { CodeRead, DocumentTagRead } from "../../api/openapi";
import { openTreeDataEditDialog } from "../CrudDialog/TreeData/TreeDataEditDialog";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants";

interface DataEditMenuItemProps {
  data: DocumentTagRead | CodeRead;
  onClick?: () => void;
  dataType: string;
}

function DataEditMenuItem({ data, onClick, dataType, ...props }: DataEditMenuItemProps & MenuItemProps) {
  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) onClick();
    openTreeDataEditDialog({ data: data, dataId: data.id });
  };
  const dataLabel = dataType === KEYWORD_TAGS ? "tag" : "code";
  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit {dataLabel} </ListItemText>
    </MenuItem>
  );
}

export default DataEditMenuItem;
