import { Menu } from "@mui/material";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { ContextMenuProps } from "../../components/ContextMenu/ContextMenuProps.tsx";
import MemoMenuItem from "../Memo/MemoMenuItem.tsx";
import { ITagTree } from "./ITagTree.ts";
import TagEditMenuItem from "./TagEditMenuItem.tsx";

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
