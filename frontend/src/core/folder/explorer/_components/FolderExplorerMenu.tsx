import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { useCallback, useState } from "react";
import { FolderExportMenuItem } from "../../FolderExportMenuItem";

interface FolderExplorerMenuProps {
  showFolders: boolean;
  onToggleShowFolders?: () => void;
}

export function FolderExplorerMenu({ showFolders, onToggleShowFolders }: FolderExplorerMenuProps) {
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

  const handleToggleShowFolders = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      onToggleShowFolders?.();
      setAnchorEl(null);
    },
    [onToggleShowFolders],
  );

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleToggleShowFolders}>
          <ListItemIcon>{getIconComponent(showFolders ? Icon.VISIBILITY : Icon.VISIBILITY_OFF)}</ListItemIcon>
          <ListItemText>Show/hide folders</ListItemText>
        </MenuItem>
        <FolderExportMenuItem />
      </Menu>
    </>
  );
}
