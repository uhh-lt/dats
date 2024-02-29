import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import CommentIcon from "@mui/icons-material/Comment";
import MemoAPI, { MemoEvent } from "./MemoAPI.ts";

interface MemoButtonProps {
  onClick?: () => void;
}

export default function MemoButton({
  memoId,
  attachedObjectType,
  attachedObjectId,
  onClick,
  ...props
}: MemoButtonProps & MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    if (onClick) onClick();
    MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
  };

  return (
    <Tooltip title="Memo">
      <span>
        <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
          <CommentIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
