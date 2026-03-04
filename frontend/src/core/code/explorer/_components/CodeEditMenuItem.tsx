import { CodeRead } from "@api/models/CodeRead";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { UIDialogActions } from "@store/global/dialogSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { MouseEvent, memo, useCallback } from "react";

interface CodeEditMenuItemProps {
  code: CodeRead;
  onClick: () => void;
}

export const CodeEditMenuItem = memo(
  ({ code, onClick, ...props }: CodeEditMenuItemProps & Omit<MenuItemProps, "onClick">) => {
    const dispatch = useAppDispatch();

    const handleClickOpen = useCallback(
      (event: MouseEvent) => {
        event.stopPropagation();
        dispatch(UIDialogActions.openCodeEditDialog({ code }));
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
  },
);
