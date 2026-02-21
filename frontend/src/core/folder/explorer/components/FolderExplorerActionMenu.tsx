import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { FolderRead } from "../../../../api/openapi/models/FolderRead.ts";
import { ITree } from "../../../../components/TreeExplorer/ITree.ts";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import { FolderEditMenuItem } from "../../dialog/FolderEditMenuItem.tsx";

interface FolderExplorerActionMenuProps {
  node: ITree<FolderRead>;
}

export function FolderExplorerActionMenu({ node }: FolderExplorerActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  }, []);

  return (
    <>
      <IconButton size="small" sx={{ p: 0 }} onClick={handleClick}>
        {getIconComponent(Icon.CONTEXT_MENU)}
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <FolderEditMenuItem folder={node.data} onClick={handleClose} />
      </Menu>
    </>
  );
}
