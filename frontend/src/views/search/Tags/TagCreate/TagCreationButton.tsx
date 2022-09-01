import eventBus from "../../../../EventBus";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import AddIcon from "@mui/icons-material/Add";

interface TagActionButtonCreateProps {
  tagName: string;
}

/**
 * A button that sends the 'open-tag' event to open the TagCreationDialog
 * @param tagName The name of the DocumentTag to be created. The button will display the name, and the TagCreationDialog's form will be pre-filled with this name.
 */
function TagCreationButton({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) {
  const handleCreateTag = () => {
    eventBus.dispatch("open-tag", { tagName: tagName });
  };

  return (
    <ListItemButton onClick={() => handleCreateTag()} {...props}>
      <ListItemIcon>
        <AddIcon />
      </ListItemIcon>
      <ListItemText primary={tagName.length > 0 ? `"${tagName}" (Create new)` : "Create new"} />
    </ListItemButton>
  );
}

export default TagCreationButton;
