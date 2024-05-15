import EditIcon from "@mui/icons-material/Edit";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

interface CodeEditMenuItemProps {
  code: CodeRead;
  onClick: () => void;
}

function CodeEditMenuItem({ code, onClick, ...props }: CodeEditMenuItemProps & Omit<MenuItemProps, "onClick">) {
  const dispatch = useAppDispatch();

  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch(CRUDDialogActions.openCodeEditDialog({ code }));
    onClick();
  };

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit code</ListItemText>
    </MenuItem>
  );
}

export default CodeEditMenuItem;
