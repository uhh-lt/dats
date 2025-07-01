import { Box, Card, CardContent, PopoverPosition, Typography } from "@mui/material";
import SdocHooks from "../../api/SdocHooks.ts";

export interface MapTooltipData {
  id?: string;
  position?: PopoverPosition;
}

interface MapTooltipProps {
  data: MapTooltipData;
}

function MapTooltip({ data }: MapTooltipProps) {
  const sdocId = parseInt(data.id || "0", 10);
  const sdocData = SdocHooks.useGetDocumentData(sdocId);
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
          <CardContent>
            {sdocData.data ? (
              <Typography>
                <b>Preview:</b> {sdocData.data.sentences[0]}...
              </Typography>
            ) : (
              <Typography>Loading...</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  } else {
    return null;
  }
}

export default MapTooltip;
