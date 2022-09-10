import { Card, CardActionArea, CardActions, CardContent, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import React from "react";

interface AnalysisCardProps {}

function AnalysisCard({}: AnalysisCardProps) {
  return (
    <Card sx={{ width: 368 }}>
      <CardActionArea component={Link} to={`/search`}>
        <CardContent sx={{ padding: "0px !important" }}>
          <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={200}>
            Das ist die super tolle analysis funktion, damit kannst du das alles machen!
          </Typography>
        </CardContent>
        <CardActions>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Analysis!
          </Typography>
        </CardActions>
      </CardActionArea>
    </Card>
  );
}

export default AnalysisCard;
