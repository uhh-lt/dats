import { Menu, MenuProps, PopoverPosition } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";

export interface GenericPositionMenuHandle {
  open: (position: PopoverPosition) => void;
  close: () => void;
}

interface GenericPositionContextMenuProps extends Omit<MenuProps, "anchorEl" | "open" | "onClose"> {
  children: React.ReactNode;
  onClose?: () => void;
}

const GenericPositionMenu = forwardRef<GenericPositionMenuHandle, GenericPositionContextMenuProps>(
  ({ children, onClose, ...props }, ref) => {
    const [anchorPosition, setAnchorPosition] = useState<PopoverPosition | undefined>(undefined);
    const isOpen = Boolean(anchorPosition);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openContextMenu,
      close: closeContextMenu,
    }));

    const openContextMenu = (position: PopoverPosition) => {
      setAnchorPosition(position);
    };

    const closeContextMenu = () => {
      if (onClose) onClose();
      setAnchorPosition(undefined);
    };

    return (
      <Menu
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition}
        open={isOpen}
        onClose={closeContextMenu}
        {...props}
      >
        {children}
      </Menu>
    );
  },
);
