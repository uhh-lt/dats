import { Card, CardActionArea, CardActions, CardContent, Typography } from "@mui/material";
import { Link } from "react-router-dom";

interface AnalysisCardProps {
  to: string;
  title: string;
  description: string;
  color?: string;
}

function AnalysisCard({ to, title, description, color }: AnalysisCardProps) {
  return (
    <Card sx={{ width: 368 }}>
      <CardActionArea component={Link} to={to}>
        <CardContent sx={{ padding: "0px !important" }}>
          <Typography variant="body2" color="text.primary" bgcolor={color || "lightgrey"} p={2} height={200}>
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
}

export default AnalysisCard;
