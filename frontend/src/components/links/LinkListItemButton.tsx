import type { ListItemButtonProps } from "@mui/material";
import { ListItemButton } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

const ListItemButtonLinkComponent = (props: ListItemButtonProps<"a">) => <ListItemButton component="a" {...props} />;

const CreatedListItemButtonLinkComponent = createLink(ListItemButtonLinkComponent);

export const LinkListItemButton: LinkComponent<typeof ListItemButtonLinkComponent> = (props) => {
  return <CreatedListItemButtonLinkComponent preload={"intent"} {...props} />;
};
