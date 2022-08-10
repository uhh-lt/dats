import { IconButton, IconButtonProps } from "@mui/material";
import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import eventBus from "../../../../EventBus";

/**
 * A button that sends the 'open-edit-tag' event to open the TagEditDialog
 * @param tagId id of the DocumentTag to edit
 */
function TagEditButton({ tagId, ...props }: IconButtonProps & { tagId: number }) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    eventBus.dispatch("open-edit-tag", tagId);
  };

  return (
    <IconButton onClick={handleClickOpen} {...props}>
      <EditIcon />
    </IconButton>
  );
}

export default TagEditButton;
