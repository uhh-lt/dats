import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { ITree } from "../../../../components/TreeExplorer/ITree.ts";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import { MemoMenuItem } from "../../../memo/dialog/MemoMenuItem.tsx";
import { CodeEditMenuItem } from "./CodeEditMenuItem.tsx";
import { CodeToggleVisibilityMenuItem } from "./CodeToggleVisibilityMenuItem.tsx";

interface CodeExplorerActionMenuProps {
  node: ITree<CodeRead>;
}

export function CodeExplorerActionMenu({ node }: CodeExplorerActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <CodeToggleVisibilityMenuItem code={node} onClick={handleClose} />
        <CodeEditMenuItem code={node.data as CodeRead} onClick={handleClose} />
        <MemoMenuItem
          attachedObjectId={node.data.id}
          attachedObjectType={AttachedObjectType.CODE}
          onClick={handleClose}
        />
      </Menu>
    </>
  );
}
