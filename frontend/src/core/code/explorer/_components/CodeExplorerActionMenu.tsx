import { ITree } from "@components/tree-explorer";
import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType";
import { CodeRead } from "../../../../api/openapi/models/CodeRead";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils";
import { MemoMenuItem } from "../../../memo/dialog/MemoMenuItem";
import { CodeEditMenuItem } from "./CodeEditMenuItem";
import { CodeToggleVisibilityMenuItem } from "./CodeToggleVisibilityMenuItem";

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
