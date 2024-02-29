import { Popover, PopoverProps } from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";

interface GenericAnchorPopoverProps
  extends Omit<PopoverProps, "open" | "onClose" | "anchorEl" | "anchorReference" | "onContextMenu"> {
  children: React.ReactNode;
}

export interface GenericAnchorPopoverHandle {
  open: (element: HTMLElement) => void;
  close: () => void;
}

const GenericAnchorPopover = forwardRef<GenericAnchorPopoverHandle, GenericAnchorPopoverProps>(
  ({ children, ...props }, ref) => {
    // local state
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const isOpen = Boolean(anchorEl);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openContextMenu,
      close: closeContextMenu,
    }));

    // methods
    const openContextMenu = (element: HTMLElement) => {
      setAnchorEl(element);
    };

    const closeContextMenu = () => {
      setAnchorEl(null);
    };

    // ui events
    const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = (event) => {
      event.preventDefault();
      closeContextMenu();
    };

    return (
      <Popover
        open={isOpen}
        onClose={() => closeContextMenu()}
        anchorEl={anchorEl}
        anchorReference="anchorEl"
        onContextMenu={handleContextMenu}
        {...props}
      >
        {children}
      </Popover>
    );
  },
);

export default GenericAnchorPopover;
