import AddIcon from "@mui/icons-material/Add";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

interface TagActionButtonCreateProps {
  tagName: string;
}

/**
 * A button that sends the 'open-tag' event to open the TagCreationDialog
 * @param tagName The name of the DocumentTag to be created. The button will display the name, and the TagCreationDialog's form will be pre-filled with this name.
 */
function TagMenuCreationButton({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch(CRUDDialogActions.openTagCreateDialog({ tagName }));
  };

  return (
    <ListItemButton onClick={handleClick} {...props}>
      <ListItemIcon>
        <AddIcon />
      </ListItemIcon>
      <ListItemText primary={tagName.length > 0 ? `"${tagName}" (Create new)` : "Create new tag"} />
    </ListItemButton>
  );
}

export default TagMenuCreationButton;
