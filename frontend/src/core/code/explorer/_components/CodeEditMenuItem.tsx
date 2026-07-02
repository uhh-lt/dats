import { CodeRead } from "@api/models/CodeRead";
import { Icon, getIconComponent } from "@components/icons";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { MouseEvent, memo, useCallback } from "react";

interface CodeEditMenuItemProps {
  code: CodeRead;
  onClick: () => void;
}

export const CodeEditMenuItem = memo(
  ({ code, onClick, ...props }: CodeEditMenuItemProps & Omit<MenuItemProps, "onClick">) => {
    const openCodeEditDialog = useOpenDialog("codeEdit");

    const handleClickOpen = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation();
        openCodeEditDialog({ code });
        onClick();
      },
      [code, openCodeEditDialog, onClick],
    );

    return (
      <MenuItem onClick={handleClickOpen} {...props}>
        <ListItemIcon>{getIconComponent(Icon.EDIT, { fontSize: "small" })}</ListItemIcon>
        <ListItemText>Edit code</ListItemText>
      </MenuItem>
    );
  },
);
