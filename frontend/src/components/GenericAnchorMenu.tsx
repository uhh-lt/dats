import { Menu, MenuProps } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";

export interface GenericAnchorContextMenuHandle {
  open: (element: HTMLElement) => void;
  close: () => void;
}

interface GenericAnchorContextMenuProps extends Omit<MenuProps, "anchorEl" | "open" | "onClose"> {
  children: React.ReactNode;
}

const GenericAnchorMenu = forwardRef<GenericAnchorContextMenuHandle, GenericAnchorContextMenuProps>(
  ({ children, ...props }, ref) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const isOpen = Boolean(anchorEl);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openContextMenu,
      close: closeContextMenu,
    }));

    const openContextMenu = (element: HTMLElement) => {
      setAnchorEl(element);
    };

    const closeContextMenu = () => {
      setAnchorEl(null);
    };

    return (
      <Menu anchorEl={anchorEl} open={isOpen} onClose={closeContextMenu} {...props}>
        {children}
      </Menu>
    );
  }
);

export default GenericAnchorMenu;
