import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
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
    <Tooltip title="Edit tag">
      <IconButton onClick={handleClickOpen} {...props}>
        <EditIcon />
      </IconButton>
    </Tooltip>
  );
}

export default TagEditButton;
