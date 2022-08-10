import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import React from "react";
import CommentIcon from "@mui/icons-material/Comment";
import MemoAPI, { MemoEvent } from "./MemoAPI";

export default function MemoButton({
  codeId,
  sdocId,
  tagId,
  memoId,
  spanAnnotationId,
  ...props
}: MemoEvent & IconButtonProps) {
  const handleClickOpen = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    MemoAPI.openMemo({ codeId, sdocId, tagId, memoId, spanAnnotationId });
  };

  return (
    <Tooltip title="Memo">
      <IconButton onClick={handleClickOpen} {...(props as IconButtonProps)}>
        <CommentIcon />
      </IconButton>
    </Tooltip>
  );
}
