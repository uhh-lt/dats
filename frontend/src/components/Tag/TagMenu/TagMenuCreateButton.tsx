import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface TagActionButtonCreateProps {
  tagName: string;
}

/**
 * A button that sends the 'open-tag' event to open the TagCreationDialog
 * @param tagName The name of the DocumentTag to be created. The button will display the name, and the TagCreationDialog's form will be pre-filled with this name.
 */
function TagMenuCreateButton({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.openTagCreateDialog({ tagName }));
  }, [dispatch, tagName]);

  const buttonText = tagName.length > 0 ? `"${tagName}" (Create new)` : "Create new tag";

  return (
    <ListItemButton onClick={handleClick} {...props}>
      <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
      <ListItemText primary={buttonText} />
    </ListItemButton>
  );
}

export default memo(TagMenuCreateButton);
