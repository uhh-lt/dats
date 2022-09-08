import { Menu } from "@mui/material";
import React from "react";
import CodeToggleVisibilityMenuItem from "./CodeToggleVisibilityMenuItem";
import { ContextMenuProps } from "../../projects/ProjectContextMenu2";
import CodeEditMenuItem from "./CodeEditMenuItem";
import MemoMenuItem from "../../../features/memo-dialog/MemoMenuItem";
import ICodeTree from "./ICodeTree";

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
          <CodeEditMenuItem code={node.code} onClick={handleClose} />
          <MemoMenuItem codeId={node.code.id} onClick={handleClose} />
        </>
      )}
    </Menu>
  );
}

export default CodeExplorerContextMenu;
