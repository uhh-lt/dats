import { Menu, MenuProps, PopoverPosition } from "@mui/material";
import { useImperativeHandle, useState } from "react";

export interface GenericPositionMenuHandle {
  open: (position: PopoverPosition) => void;
  close: () => void;
}

interface GenericPositionContextMenuProps extends Omit<MenuProps, "anchorEl" | "open" | "onClose" | "ref"> {
  children: React.ReactNode;
  onClose?: () => void;
  ref?: React.Ref<GenericPositionMenuHandle>;
}

export const GenericPositionMenu = ({ ref, children, onClose, ...props }: GenericPositionContextMenuProps) => {
  const [anchorPosition, setAnchorPosition] = useState<PopoverPosition | undefined>(undefined);
  const isOpen = Boolean(anchorPosition);

  const openContextMenu = (position: PopoverPosition) => {
    setAnchorPosition(position);
  };

  const closeContextMenu = () => {
    if (onClose) onClose();
    setAnchorPosition(undefined);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openContextMenu,
    close: closeContextMenu,
  }));

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
};
