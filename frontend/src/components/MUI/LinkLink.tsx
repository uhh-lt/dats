import type { LinkProps } from "@mui/material";
import { Link } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

const LinkComponent = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => <Link ref={ref} {...props} />);

const CreatedLinkComponent = createLink(LinkComponent);

export const LinkLink: LinkComponent<typeof LinkComponent> = (props) => {
  return <CreatedLinkComponent preload={"intent"} {...props} />;
};
