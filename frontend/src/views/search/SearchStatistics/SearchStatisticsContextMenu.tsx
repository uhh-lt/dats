import { Box, ListItemText, Menu, MenuItem } from "@mui/material";
import React from "react";
import { CodeRead } from "../../../api/openapi";

export interface ContextMenuData {
  x: number;
  y: number;
}

interface SearchContextMenuProps {
  contextMenuData: ContextMenuData | null;
  handleClose: () => void;
  menuItems: CodeRead[];
  handleMenuItemClick: (code: CodeRead) => void;
}

function SearchStatisticsContextMenu({
  menuItems,
  handleMenuItemClick,
  contextMenuData,
  handleClose,
}: SearchContextMenuProps) {
  return (
    <Menu
      id="basic-menu"
      open={contextMenuData !== null}
      onClose={handleClose}
      anchorPosition={contextMenuData !== null ? { top: contextMenuData.y, left: contextMenuData.x } : undefined}
      anchorReference="anchorPosition"
      onContextMenu={(e) => {
        e.preventDefault();
        handleClose();
      }}
      PaperProps={{ sx: { width: 240, maxHeight: 300 } }}
    >
      <Box>
        {menuItems.map((value) => (
          <MenuItem
            key={value.id}
            onClick={() => {
              handleClose();
              handleMenuItemClick(value);
            }}
          >
            <Box width={20} height={20} bgcolor={value.color} mr={2} />
            <ListItemText>{value.name}</ListItemText>
          </MenuItem>
        ))}
      </Box>
    </Menu>
  );
}

export default SearchStatisticsContextMenu;
