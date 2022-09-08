import { Menu, PaperProps } from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";

export interface SuperContextMenuPosition {
  x: number;
  y: number;
}

export interface SuperContextMenuHandle {
  openContextMenu: (position: SuperContextMenuPosition) => void;
  closeContextMenu: () => void;
}

interface SuperContextMenuProps {
  children?: React.ReactNode;
}

const SuperContextMenu = forwardRef<SuperContextMenuHandle, SuperContextMenuProps & PaperProps>(
  ({ children, ...props }, ref) => {
    // local client state
    const [position, setPosition] = useState<SuperContextMenuPosition | null>(null);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      openContextMenu,
      closeContextMenu,
    }));

    const openContextMenu = (position: SuperContextMenuPosition) => {
      setPosition(position);
    };

    const closeContextMenu = () => {
      setPosition(null);
    };

    return (
      <Menu
        open={position !== null}
        onClose={closeContextMenu}
        anchorPosition={position !== null ? { top: position.y, left: position.x } : undefined}
        anchorReference="anchorPosition"
        onContextMenu={(e) => {
          e.preventDefault();
          closeContextMenu();
        }}
        PaperProps={props}
      >
        {children}
      </Menu>
    );
  }
);

export default SuperContextMenu;
