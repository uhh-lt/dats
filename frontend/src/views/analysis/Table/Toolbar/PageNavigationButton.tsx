import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from "@mui/material";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import CheckIcon from "@mui/icons-material/Check";
import { TablePage } from "../../../../api/TableHooks.ts";

interface PageNavigationButtonProps {
  tablePages: TablePage[];
  currentPageId: string;
  onPageIdChange: (pageId: string) => void;
}

function PageNavigationButton({ tablePages, currentPageId, onPageIdChange }: PageNavigationButtonProps) {
  // local client state
  const [pageNavigationMenuAnchorEl, setPageNavigationMenuAnchorEl] = useState<null | HTMLElement>(null);
  const pageNavigationMenuOpen = Boolean(pageNavigationMenuAnchorEl);

  // events
  const handleOpenPageNavigationMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPageNavigationMenuAnchorEl(event.currentTarget);
  };
  const handleClosePageNavigationMenu = () => {
    setPageNavigationMenuAnchorEl(null);
  };
  const handleClickPageNavigationMenuItem = (pageId: string) => {
    setPageNavigationMenuAnchorEl(null);
    onPageIdChange(pageId);
  };

  return (
    <>
      <Tooltip title="All pages">
        <IconButton onClick={handleOpenPageNavigationMenu}>
          <MenuIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={pageNavigationMenuAnchorEl} open={pageNavigationMenuOpen} onClose={handleClosePageNavigationMenu}>
        {tablePages.map((tablePage) => (
          <MenuItem key={tablePage.id} onClick={() => handleClickPageNavigationMenuItem(tablePage.id)}>
            {tablePage.id === currentPageId ? (
              <>
                <ListItemIcon>
                  <CheckIcon />
                </ListItemIcon>
                {tablePage.name}
              </>
            ) : (
              <ListItemText inset>{tablePage.name}</ListItemText>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default PageNavigationButton;
