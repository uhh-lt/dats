import { getIconComponent, Icon } from "@components/icons";
import { ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { memo, useCallback, useState } from "react";
import { useTabManager } from "../../hooks/useTabManager";
import { TabIconButton } from "./styledComponents";

interface TabMenuButtonProps {
  projectId: number;
  activeTabId: string | null;
  totalTabs: number;
}

export const TabMenuButton = memo(({ projectId, activeTabId, totalTabs }: TabMenuButtonProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const openQuickCommandMenu = useOpenDialog("quickCommandMenu");
  const { goToPreviousTab, goToNextTab, closeAllTabs, closeTabsToRight } = useTabManager(projectId);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelectPreviousTab = useCallback(() => {
    goToPreviousTab();
    handleClose();
  }, [handleClose, goToPreviousTab]);

  const handleSelectNextTab = useCallback(() => {
    goToNextTab();
    handleClose();
  }, [handleClose, goToNextTab]);

  const handleCloseAll = useCallback(() => {
    closeAllTabs();
    handleClose();
  }, [handleClose, closeAllTabs]);

  const handleCloseAllToRight = useCallback(() => {
    if (activeTabId) {
      closeTabsToRight(activeTabId);
    }
    handleClose();
  }, [activeTabId, handleClose, closeTabsToRight]);

  const handleOpenCommandMenu = useCallback(() => {
    handleClose();
    openQuickCommandMenu();
  }, [handleClose, openQuickCommandMenu]);

  return (
    <>
      <TabIconButton onClick={handleClick} aria-label="tab options">
        {getIconComponent(Icon.CONTEXT_MENU)}
      </TabIconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleSelectPreviousTab} disabled={totalTabs === 0}>
          <ListItemText>Previous tab </ListItemText>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            ⌘⇧←
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleSelectNextTab} disabled={totalTabs === 0}>
          <ListItemText>Next tab </ListItemText>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            ⌘⇧→
          </Typography>
        </MenuItem>
        <MenuItem onClick={handleCloseAll} disabled={totalTabs === 0}>
          <ListItemText>Close all tabs</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCloseAllToRight} disabled={!activeTabId || totalTabs <= 1}>
          <ListItemText>Close tabs to the right</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenCommandMenu}>
          <ListItemText sx={{ mr: 1 }}>Open command menu</ListItemText>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            ⌘⇧P
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
});
