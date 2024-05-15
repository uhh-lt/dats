import { Menu } from "@mui/material";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { ContextMenuProps } from "../../../components/ContextMenu/ContextMenuProps.tsx";
import MemoMenuItem from "../../../features/Memo/MemoMenuItem.tsx";
import CodeEditMenuItem from "./CodeEditMenuItem.tsx";
import CodeToggleVisibilityMenuItem from "./CodeToggleVisibilityMenuItem.tsx";
import { ICodeTree } from "./ICodeTree.ts";

interface CodeExplorerContextMenuProps extends ContextMenuProps {
  node: ICodeTree | undefined;
}

function CodeExplorerContextMenu({ position, handleClose, node }: CodeExplorerContextMenuProps) {
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
      {node && (
        <>
          <CodeToggleVisibilityMenuItem code={node} onClick={handleClose} />
          <CodeEditMenuItem code={node.data} onClick={handleClose} />
          <MemoMenuItem
            attachedObjectId={node.data.id}
            attachedObjectType={AttachedObjectType.CODE}
            onClick={handleClose}
          />
        </>
      )}
    </Menu>
  );
}

export default CodeExplorerContextMenu;
