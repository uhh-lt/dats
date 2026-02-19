import type { LinkProps } from "@mui/material";
import { Card, CardActionArea, CardActions, CardContent, Typography } from "@mui/material";
import type { LinkComponent } from "@tanstack/react-router";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

interface LinkCardProps extends LinkProps {
  title: string;
  description: string;
  color?: string;
}

const CardLinkComponent = forwardRef<HTMLAnchorElement, LinkCardProps>(
  ({ title, description, color, ...props }, ref) => {
    return (
      <Card sx={{ width: 360, flexShrink: 0 }}>
        <CardActionArea ref={ref} component="a" {...props}>
          <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="textPrimary" bgcolor={color || "lightgrey"} p={2} height={200}>
              {description}
            </Typography>
          </CardContent>
          <CardActions>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
          </CardActions>
        </CardActionArea>
      </Card>
    );
  },
);

const CreatedCardLinkComponent = createLink(CardLinkComponent);

const LinkCard: LinkComponent<typeof CardLinkComponent> = (props) => {
  return <CreatedCardLinkComponent preload={"intent"} {...props} />;
};

export default LinkCard;
