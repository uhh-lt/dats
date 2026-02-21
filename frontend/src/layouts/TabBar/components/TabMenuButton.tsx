import { ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { TabIconButton } from "../styles/styledComponents.tsx";
import { TabActions } from "../tabSlice";

interface TabMenuButtonProps {
  projectId: number;
  activeTabIndex: number | null;
  totalTabs: number;
}

export const TabMenuButton = memo(({ projectId, activeTabIndex, totalTabs }: TabMenuButtonProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const dispatch = useAppDispatch();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelectPreviousTab = useCallback(() => {
    dispatch(TabActions.goToLeftTab({ projectId }));
    handleClose();
  }, [dispatch, projectId, handleClose]);

  const handleSelectNextTab = useCallback(() => {
    dispatch(TabActions.goToRightTab({ projectId }));
    handleClose();
  }, [dispatch, projectId, handleClose]);

  const handleCloseAll = useCallback(() => {
    dispatch(TabActions.closeAllTabs({ projectId }));
    handleClose();
  }, [dispatch, projectId, handleClose]);

  const handleCloseAllToRight = useCallback(() => {
    if (activeTabIndex !== null) {
      dispatch(TabActions.closeTabsToRight({ projectId, fromIndex: activeTabIndex }));
    }
    handleClose();
  }, [dispatch, projectId, activeTabIndex, handleClose]);

  const handleOpenCommandMenu = useCallback(() => {
    handleClose();
    dispatch(CRUDDialogActions.openQuickCommandMenu());
  }, [dispatch, handleClose]);

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
        <MenuItem onClick={handleCloseAllToRight} disabled={activeTabIndex === null || activeTabIndex >= totalTabs - 1}>
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
