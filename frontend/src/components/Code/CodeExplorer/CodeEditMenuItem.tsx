import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React, { memo, useCallback } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface CodeEditMenuItemProps {
  code: CodeRead;
  onClick: () => void;
}

function CodeEditMenuItem({ code, onClick, ...props }: CodeEditMenuItemProps & Omit<MenuItemProps, "onClick">) {
  const dispatch = useAppDispatch();

  const handleClickOpen = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      dispatch(CRUDDialogActions.openCodeEditDialog({ code }));
      onClick();
    },
    [code, dispatch, onClick],
  );

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
      <ListItemText>Edit code</ListItemText>
    </MenuItem>
  );
}

export default memo(CodeEditMenuItem);
