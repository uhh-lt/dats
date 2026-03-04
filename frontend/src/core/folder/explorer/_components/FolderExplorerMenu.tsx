import { IconButton, Menu } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { useCallback, useState } from "react";
import { FolderExportMenuItem } from "../../FolderExportMenuItem";
import { FolderToggleVisibilityMenuItem } from "./FolderToggleVisibilityMenuItem";

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
        <FolderExportMenuItem />
      </Menu>
    </>
  );
}
