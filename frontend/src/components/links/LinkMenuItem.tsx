import type { ButtonProps } from "@mui/material";
import { MenuItem } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

const MenuItemLinkComponent = (props: ButtonProps<"a">) => <MenuItem component="a" {...props} />;

const CreatedMenuItemLinkComponent = createLink(MenuItemLinkComponent);

export const LinkMenuItem: LinkComponent<typeof MenuItemLinkComponent> = (props) => {
  return <CreatedMenuItemLinkComponent preload={"intent"} {...props} />;
};
