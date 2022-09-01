import { Menu } from "@mui/material";
import React from "react";
import TagMenuListButtton from "./TagMenuListButtton";

export interface ContextMenuData {
  x: number;
  y: number;
}

interface SearchContextMenuProps {
  contextMenuData: ContextMenuData | null;
  handleClose: () => void;
}

function SearchResultContextMenu({ contextMenuData, handleClose }: SearchContextMenuProps) {
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
      PaperProps={{ sx: { width: 240 } }}
    >
      <TagMenuListButtton popoverOrigin={{ vertical: "top", horizontal: "right" }} />
    </Menu>
  );
}

export default SearchResultContextMenu;
