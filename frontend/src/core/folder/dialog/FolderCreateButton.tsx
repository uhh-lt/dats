import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { memo, useCallback } from "react";
import { UIDialogActions } from "../../../store/global/dialogSlice";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils";

interface FolderActionButtonCreateProps {
  folderName: string;
}

export const FolderCreateButton = memo(
  ({ folderName, ...props }: FolderActionButtonCreateProps & ListItemButtonProps) => {
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      dispatch(UIDialogActions.openFolderCreateDialog({ folderName }));
    }, [dispatch, folderName]);

    const buttonText = folderName.length > 0 ? `"${folderName}" (Create new)` : "Create new folder";

    return (
      <ListItemButton onClick={handleClick} {...props}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary={buttonText} />
      </ListItemButton>
    );
  },
);
