import { Icon, getIconComponent } from "@components/icons";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useCallback, useState } from "react";
import { FolderExportMenuItem } from "../../FolderExportMenuItem";

interface FolderExplorerMenuProps {
  showFolders: boolean;
  onToggleShowFolders?: () => void;
  showChildFolders?: boolean;
  onToggleShowChildFolders?: () => void;
}

export function FolderExplorerMenu({
  showFolders,
  onToggleShowFolders,
  showChildFolders,
  onToggleShowChildFolders,
}: FolderExplorerMenuProps) {
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

  const handleToggleShowChildFolders = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      onToggleShowChildFolders?.();
      setAnchorEl(null);
    },
    [onToggleShowChildFolders],
  );

  return (
    <>
      <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleToggleShowFolders}>
          <ListItemIcon>{getIconComponent(showFolders ? Icon.VISIBILITY : Icon.VISIBILITY_OFF)}</ListItemIcon>
          <ListItemText>Show/hide folders</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleShowChildFolders}>
          <ListItemIcon>{showChildFolders ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}</ListItemIcon>
          <ListItemText>Show items in subfolders</ListItemText>
        </MenuItem>
        <FolderExportMenuItem />
      </Menu>
    </>
  );
}
