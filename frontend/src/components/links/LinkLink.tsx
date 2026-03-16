import type { LinkProps } from "@mui/material";
import { Link } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

const LinkComponent = (props: LinkProps) => <Link {...props} />;

const CreatedLinkComponent = createLink(LinkComponent);

export const LinkLink: LinkComponent<typeof LinkComponent> = (props) => {
  return <CreatedLinkComponent preload={"intent"} {...props} />;
};
