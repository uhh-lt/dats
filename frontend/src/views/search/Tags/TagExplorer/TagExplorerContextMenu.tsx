import { Menu } from "@mui/material";
import React from "react";
import MemoMenuItem from "../../../../features/Memo/MemoMenuItem";
import { ContextMenuProps } from "../../../../components/ContextMenu/ContextMenuProps";
import TagEditMenuItem from "../TagEdit/TagEditMenuItem";
import { AttachedObjectType } from "../../../../api/openapi";

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
      <MemoMenuItem
        onClick={handleClose}
        attachedObjectId={tagId}
        attachedObjectType={AttachedObjectType.DOCUMENT_TAG}
      />
    </Menu>
  );
}

export default TagExplorerContextMenu;
