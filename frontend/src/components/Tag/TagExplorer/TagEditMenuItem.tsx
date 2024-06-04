import EditIcon from "@mui/icons-material/Edit";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";

interface TagEditMenuItemProps {
  tag: DocumentTagRead;
}

function TagEditMenuItem({ tag, onClick, ...props }: TagEditMenuItemProps & MenuItemProps) {
  const dispatch = useAppDispatch();

  const handleClickOpen: React.MouseEventHandler<HTMLLIElement> = (event) => {
    event.stopPropagation();
    if (onClick) onClick(event);
    dispatch(CRUDDialogActions.openTagEditDialog({ tagId: tag.id }));
  };

  return (
    <MenuItem onClick={handleClickOpen} {...props}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
}

export default TagEditMenuItem;
