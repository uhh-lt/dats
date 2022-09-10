import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import CommentIcon from "@mui/icons-material/Comment";
import MemoAPI, { MemoEvent } from "./MemoAPI";

export default function MemoButton({
  memoId,
  attachedObjectType,
  attachedObjectId,
  ...props
}: MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title="Memo">
      <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
        <CommentIcon />
      </IconButton>
    </Tooltip>
  );
}
