import { Menu } from "@mui/material";
import React from "react";
import { ContextMenuProps } from "../projects/ProjectContextMenu2";
import MemoEditMenuItem from "../../features/memo-dialog/MemoEditMenuItem";
import MemoStarMenuItem from "../../features/memo-dialog/MemoStarMenuItem";

interface MemoResultsContextMenuProps extends ContextMenuProps {
  memoId: number | undefined;
  memoStarred: boolean | undefined;
}

function MemoResultsContextMenu({ position, handleClose, memoId, memoStarred }: MemoResultsContextMenuProps) {
  return (
    <Menu
      open={position !== null}
      onClose={handleClose}
      anchorPosition={position !== null ? { top: position.y, left: position.x } : undefined}
      anchorReference="anchorPosition"
      onContextMenu={(e) => {
        e.preventDefault();
        handleClose();
      }}
      PaperProps={{ sx: { width: 240, maxHeight: 300 } }}
    >
      <MemoStarMenuItem memoId={memoId} isStarred={memoStarred} onClick={handleClose} />
      <MemoEditMenuItem memoId={memoId} onClick={handleClose} />
    </Menu>
  );
}

export default MemoResultsContextMenu;
