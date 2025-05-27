import { Box, Card, CardContent, PopoverPosition } from "@mui/material";

export interface MapTooltipData {
  id?: string;
  position?: PopoverPosition;
}

interface MapTooltipProps {
  data: MapTooltipData;
}

function MapTooltip({ data }: MapTooltipProps) {
  if (data.id && data.position) {
    return (
      <Box
        maxWidth="sm"
        sx={{
          display: data.position ? "block" : "none",
          position: "absolute",
          top: data.position.top,
          left: data.position.left,
          zIndex: 9999,
        }}
      >
        <Card>
          <CardContent>Hi was geht ab!</CardContent>
        </Card>
      </Box>
    );
  } else {
    return null;
  }
}

export default MapTooltip;
