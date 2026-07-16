import type { CardActionAreaProps } from "@mui/material";
import { CardActionArea } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { useTabAwareLinkProps } from "./useTabAwareLinkProps";

const CardActionAreaLinkComponent = (props: CardActionAreaProps<"a">) => <CardActionArea component="a" {...props} />;

const CreatedCardActionAreaLinkComponent = createLink(CardActionAreaLinkComponent);

export const LinkCardActionArea: LinkComponent<typeof CardActionAreaLinkComponent> = (props) => {
  const tabAwareProps = useTabAwareLinkProps(props);
  return <CreatedCardActionAreaLinkComponent preload="intent" {...tabAwareProps} />;
};
