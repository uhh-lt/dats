import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";

interface FolderActionButtonCreateProps {
  folderName: string;
}

export const FolderCreateButton = memo(
  ({ folderName, ...props }: FolderActionButtonCreateProps & ListItemButtonProps) => {
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      dispatch(CRUDDialogActions.openFolderCreateDialog({ folderName }));
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
