import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { ActionType } from "../../api/openapi";

interface ActionCardProps {
  actionTypeValue: number;
  targetObjectType: string;
  executedAt: string;
}

function ActionCard({ actionTypeValue, targetObjectType, executedAt }: ActionCardProps) {

  let backgroundColor
  switch (actionTypeValue) {
    case 0:
      backgroundColor = 'rgba(0, 255, 0, 0.2)'
      break;
    case 1:
      backgroundColor = 'rgba(255, 87, 51, 0.2)'
      break;
    case 2:
      backgroundColor = 'rgba(255, 0, 0, 0.2)'
      break;
    default:
      backgroundColor = null
  }

  return (
    <Card variant="outlined" sx={{ height: 125, width: 275, margin: 'auto', marginY: 2, backgroundColor: backgroundColor }}>
      <CardContent>
        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
          {ActionType[actionTypeValue]}
        </Typography>
        <Typography sx={{ mb: 1.5 }} variant="h5" component="div">
          {targetObjectType}
        </Typography>
        <Typography variant="body2">
          {executedAt}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ActionCard;
