import type { ButtonProps } from "@mui/material";
import { Button } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

const ButtonLinkComponent = forwardRef<HTMLAnchorElement, ButtonProps<"a">>((props, ref) => (
  <Button ref={ref} component="a" {...props} />
));

const CreatedButtonLinkComponent = createLink(ButtonLinkComponent);

export const LinkButton: LinkComponent<typeof ButtonLinkComponent> = (props) => {
  return <CreatedButtonLinkComponent preload={"intent"} {...props} />;
};
