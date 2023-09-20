import EditIcon from "@mui/icons-material/Edit";
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import React from "react";
import { openTagEditDialog } from "../../../../features/CrudDialog/Tag/TagEditDialog";

interface TagEditMenuItemProps {
  tagId: number;
  onClick: () => void;
}

/**
 * A button that sends the 'open-edit-tag' event to open the TagEditDialog
 * @param tagId id of the DocumentTag to edit
 */
function TagEditMenuItem({ tagId, onClick }: TagEditMenuItemProps) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick();
    openTagEditDialog(tagId);
  };

  return (
    <MenuItem onClick={handleClick}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Edit tag</ListItemText>
    </MenuItem>
  );
}

export default TagEditMenuItem;
