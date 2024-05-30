import { Menu } from "@mui/material";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { ContextMenuProps } from "../../components/ContextMenu/ContextMenuProps.tsx";
import MemoEditMenuItem from "../../components/Memo/MemoEditMenuItem.tsx";
import MemoStarMenuItem from "../../components/Memo/MemoStarMenuItem.tsx";

interface MemoResultsContextMenuProps extends ContextMenuProps {
  memoId: number | undefined;
  attachedObjectType: AttachedObjectType;
  memoStarred: boolean | undefined;
}

function MemoResultsContextMenu({
  position,
  handleClose,
  memoId,
  memoStarred,
  attachedObjectType,
}: MemoResultsContextMenuProps) {
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
      <MemoEditMenuItem memoId={memoId} attachedObjectType={attachedObjectType} onClick={handleClose} />
    </Menu>
  );
}

export default MemoResultsContextMenu;
