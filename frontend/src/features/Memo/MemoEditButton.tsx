import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import React from "react";
import MemoAPI, { MemoEvent } from "./MemoAPI.ts";
import EditIcon from "@mui/icons-material/Edit";

function MemoEditButton({ memoId, attachedObjectType, attachedObjectId, ...props }: MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title={"Edit memo"}>
      <span>
        <IconButton onClick={handleClickOpen} size="small" disabled={!memoId} disableRipple {...props}>
          <EditIcon fontSize="inherit" />
          <Typography variant="body1">Edit Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoEditButton;
