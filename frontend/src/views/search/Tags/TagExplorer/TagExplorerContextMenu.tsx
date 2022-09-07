import { Menu } from "@mui/material";
import React from "react";
import MemoMenuItem from "../../../../features/memo-dialog/MemoMenuItem";
import { ContextMenuProps } from "../../../projects/ProjectContextMenu2";
import TagEditMenuItem from "../TagEdit/TagEditMenuItem";

interface TagExplorerContextMenuProps extends ContextMenuProps {
  tagId: number | undefined;
}

function TagExplorerContextMenu({ tagId, position, handleClose }: TagExplorerContextMenuProps) {
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
    >
      {tagId && <TagEditMenuItem tagId={tagId} onClick={handleClose} />}
      <MemoMenuItem onClick={handleClose} tagId={tagId} />
    </Menu>
  );
}

export default TagExplorerContextMenu;
