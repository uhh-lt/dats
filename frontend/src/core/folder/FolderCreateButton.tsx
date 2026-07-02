import { Icon, getIconComponent } from "@components/icons";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { memo, useCallback } from "react";

interface FolderActionButtonCreateProps {
  folderName: string;
}

export const FolderCreateButton = memo(
  ({ folderName, ...props }: FolderActionButtonCreateProps & ListItemButtonProps) => {
    const openFolderCreateDialog = useOpenDialog("folderCreate");

    const handleClick = useCallback(() => {
      openFolderCreateDialog({ folderName });
    }, [openFolderCreateDialog, folderName]);

    const buttonText = folderName.length > 0 ? `"${folderName}" (Create new)` : "Create new folder";

    return (
      <ListItemButton onClick={handleClick} {...props}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary={buttonText} />
      </ListItemButton>
    );
  },
);
