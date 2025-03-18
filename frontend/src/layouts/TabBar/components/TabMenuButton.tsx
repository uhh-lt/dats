import { ListItemText, Menu, MenuItem } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { CRUDDialogActions } from "../../../components/dialogSlice";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { TabIconButton } from "../styles/styledComponents.tsx";
import { TabActions } from "../tabSlice";

interface TabMenuButtonProps {
  projectId: number;
  activeTabIndex: number | null;
  totalTabs: number;
}

function TabMenuButton({ projectId, activeTabIndex, totalTabs }: TabMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const dispatch = useAppDispatch();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

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
        <MenuItem onClick={handleCloseAll} disabled={totalTabs === 0}>
          <ListItemText>Close all tabs</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCloseAllToRight} disabled={activeTabIndex === null || activeTabIndex >= totalTabs - 1}>
          <ListItemText>Close tabs to the right</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpenCommandMenu}>
          <ListItemText>Open command menu</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default memo(TabMenuButton);
