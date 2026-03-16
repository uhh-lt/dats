import type { LinkProps } from "@mui/material";
import { Link } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";

interface LinkWrapperProps extends LinkProps {
  children: React.ReactNode;
  link: boolean;
}

const LinkWrapperComponent = ({ children, link, ...props }: LinkWrapperProps) => {
  if (link) {
    return (
      <Link {...props}>
        {children}
      </Link>
    );
  }
  return children;
};

const CreatedLinkWrapperComponent = createLink(LinkWrapperComponent);

export const LinkWrapper: LinkComponent<typeof LinkWrapperComponent> = (props) => {
  return <CreatedLinkWrapperComponent preload={"intent"} {...props} />;
};
