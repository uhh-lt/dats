import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import MemoAPI, { MemoEvent } from "./MemoAPI";
import EditIcon from "@mui/icons-material/Edit";

function MemoEditButton({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title={"Edit memo"}>
      <span>
        <IconButton onClick={handleClickOpen} size="small" disabled={!memoId} {...props}>
          <EditIcon fontSize="inherit" />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoEditButton;
