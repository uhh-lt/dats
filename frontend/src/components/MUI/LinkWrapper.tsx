import { Link, LinkProps } from "react-router-dom";

function LinkWrapper({
  children,
  link,
  ...props
}: {
  children: React.ReactNode;
  link: boolean;
} & LinkProps) {
  if (link) {
    return <Link {...props}>{children}</Link>;
  }
  return children;
}

export default LinkWrapper;
