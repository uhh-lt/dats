import { IconButton, Menu } from "@mui/material";
import { useCallback, useState } from "react";
import { ExportFoldersMenuItem } from "../../../../components/Export/ExportFoldersMenuItem.tsx";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import { FolderToggleVisibilityMenuItem } from "./FolderToggleVisibilityMenuItem.tsx";

export function FolderExplorerMenu() {
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
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <FolderToggleVisibilityMenuItem onClick={handleClose} />
        <ExportFoldersMenuItem />
      </Menu>
    </>
  );
}
