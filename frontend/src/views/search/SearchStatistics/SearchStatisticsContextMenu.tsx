import { Box, Divider, ListItemText, Menu, MenuItem } from "@mui/material";
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
  handleMenuItemClick: (navigateTo: string) => void;
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
        <MenuItem
          onClick={() => {
            handleClose();
            handleMenuItemClick("keywords");
          }}
        >
          <ListItemText>Keywords</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleMenuItemClick("tags");
          }}
        >
          <ListItemText>Tags</ListItemText>
        </MenuItem>
        {menuItems.length > 0 && <Divider />}
        {menuItems.map((code) => (
          <MenuItem
            key={code.id}
            onClick={() => {
              handleClose();
              handleMenuItemClick(`${code.id}`);
            }}
          >
            <Box width={20} height={20} bgcolor={code.color} mr={2} />
            <ListItemText>{code.name}</ListItemText>
          </MenuItem>
        ))}
      </Box>
    </Menu>
  );
}

export default SearchStatisticsContextMenu;
