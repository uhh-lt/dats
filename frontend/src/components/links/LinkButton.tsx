import type { ButtonProps } from "@mui/material";
import { Button } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { useTabAwareLinkProps } from "./useTabAwareLinkProps";

const ButtonLinkComponent = (props: ButtonProps<"a">) => <Button component="a" {...props} />;

const CreatedButtonLinkComponent = createLink(ButtonLinkComponent);

export const LinkButton: LinkComponent<typeof ButtonLinkComponent> = (props) => {
  const tabAwareProps = useTabAwareLinkProps(props);
  return <CreatedButtonLinkComponent preload={"intent"} {...tabAwareProps} />;
};
