import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";

interface CodeCreateListItemButtonProps {
  parentCodeId: number | undefined;
}

export const CodeCreateListItemButton = memo(
  ({ parentCodeId, ...props }: CodeCreateListItemButtonProps & Omit<ListItemButtonProps, "onClick">) => {
    const openCodeCreateDialog = useOpenDialog("codeCreate");

    const handleClick = useCallback(() => {
      openCodeCreateDialog({ parentCodeId });
    }, [openCodeCreateDialog, parentCodeId]);

    return (
      <ListItemButton {...props} onClick={handleClick}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary="Create new code" />
      </ListItemButton>
    );
  },
);
