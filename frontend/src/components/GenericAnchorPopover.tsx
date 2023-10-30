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

// eslint-disable-next-line no-empty-pattern
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
    const handleContextMenu = (event: any) => {
      event.preventDefault();
      closeContextMenu();
    };

    return (
      <Popover
        open={isOpen}
        onClose={(event, reason) => closeContextMenu()}
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
