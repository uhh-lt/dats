import { Menu } from "@mui/material";
import React from "react";
import { AttachedObjectType } from "../../api/openapi";
import { ContextMenuProps } from "../../components/ContextMenu/ContextMenuProps";
import MemoMenuItem from "../Memo/MemoMenuItem";
import { ITagTree } from "./ITagTree";
import TagEditMenuItem from "./TagEditMenuItem";

interface TagExplorerContextMenuProps extends ContextMenuProps {
  node: ITagTree | undefined;
}

function TagExplorerContextMenu({ position, handleClose, node }: TagExplorerContextMenuProps) {
  if (!node) return null;
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
      <TagEditMenuItem tag={node.data} onClick={handleClose} />
      <MemoMenuItem
        attachedObjectId={node.data.id}
        attachedObjectType={AttachedObjectType.DOCUMENT_TAG}
        onClick={handleClose}
      />
    </Menu>
  );
}

export default TagExplorerContextMenu;
