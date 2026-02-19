import type { LinkProps } from "@mui/material";
import { Link } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

interface LinkWrapperProps extends LinkProps {
  children: React.ReactNode;
  link: boolean;
}

const LinkWrapperComponent = forwardRef<HTMLAnchorElement, LinkWrapperProps>(({ children, link, ...props }, ref) => {
  if (link) {
    return (
      <Link ref={ref} {...props}>
        {children}
      </Link>
    );
  }
  return children;
});

const CreatedLinkWrapperComponent = createLink(LinkWrapperComponent);

const LinkWrapper: LinkComponent<typeof LinkWrapperComponent> = (props) => {
  return <CreatedLinkWrapperComponent preload={"intent"} {...props} />;
};

export default LinkWrapper;
