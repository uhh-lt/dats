import { FolderRead } from "@api/models/FolderRead";
import { Icon, getIconComponent } from "@components/icons";
import { ITree } from "@components/tree-explorer";
import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { FolderEditMenuItem } from "../../FolderEditMenuItem";

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
