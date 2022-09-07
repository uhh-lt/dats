import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import React from "react";
import CommentIcon from "@mui/icons-material/Comment";
import MemoAPI, { MemoEvent } from "./MemoAPI";

interface MemoMenuItemProps {
  onClick: () => void;
}

export default function MemoMenuItem({
  codeId,
  sdocId,
  tagId,
  memoId,
  spanAnnotationId,
  bboxId,
  onClick,
}: MemoEvent & MemoMenuItemProps) {
  const handleClickOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick();
    MemoAPI.openMemo({ codeId, sdocId, tagId, memoId, spanAnnotationId, bboxId });
  };

  return (
    <MenuItem onClick={handleClickOpen}>
      <ListItemIcon>
        <CommentIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Memo</ListItemText>
    </MenuItem>
  );
}
