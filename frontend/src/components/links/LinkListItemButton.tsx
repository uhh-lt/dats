import type { ListItemButtonProps } from "@mui/material";
import { ListItemButton } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

const ListItemButtonLinkComponent = forwardRef<HTMLAnchorElement, ListItemButtonProps<"a">>((props, ref) => (
  <ListItemButton ref={ref} component="a" {...props} />
));

const CreatedListItemButtonLinkComponent = createLink(ListItemButtonLinkComponent);

export const LinkListItemButton: LinkComponent<typeof ListItemButtonLinkComponent> = (props) => {
  return <CreatedListItemButtonLinkComponent preload={"intent"} {...props} />;
};
