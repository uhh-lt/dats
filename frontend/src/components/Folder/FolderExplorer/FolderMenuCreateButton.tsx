import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface FolderActionButtonCreateProps {
  folderName: string;
}

/**
 * A button that sends the 'open-folder' event to open the FolderCreationDialog
 * @param folderName The name of the DocumentFolder to be created. The button will display the name, and the FolderCreationDialog's form will be pre-filled with this name.
 */
function FolderMenuCreateButton({ folderName, ...props }: FolderActionButtonCreateProps & ListItemButtonProps) {
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
}

export default memo(FolderMenuCreateButton);
