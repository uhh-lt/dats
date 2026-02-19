import type { ButtonProps } from "@mui/material";
import { MenuItem } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

const MenuItemLinkComponent = forwardRef<HTMLAnchorElement, ButtonProps<"a">>((props, ref) => (
  <MenuItem ref={ref} component="a" {...props} />
));

const CreatedMenuItemLinkComponent = createLink(MenuItemLinkComponent);

export const LinkMenuItem: LinkComponent<typeof MenuItemLinkComponent> = (props) => {
  return <CreatedMenuItemLinkComponent preload={"intent"} {...props} />;
};
