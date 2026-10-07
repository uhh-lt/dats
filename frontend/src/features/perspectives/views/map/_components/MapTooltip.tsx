import { sdocQueries } from "@api/queries/sdocQueries";
import { DocType } from "@models/DocType";
import { Box, Card, CardContent, PopoverPosition, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

export interface MapTooltipData {
  id?: string;
  position?: PopoverPosition;
}

interface MapTooltipProps {
  data: MapTooltipData;
}

export function MapTooltip({ data }: MapTooltipProps) {
  const sdocId = parseInt(data.id || "0", 10);
  const sdoc = useQuery(sdocQueries.detail(sdocId));

  const sdocData = useQuery(sdocQueries.data(sdocId));
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
        <Card elevation={8}>
          <CardContent>
            {sdocData.data ? (
              <Typography>
                <b>Preview:</b> {sdocData.data.sentences[0]} {sdocData.data.sentences.length > 1 ? "..." : ""}
              </Typography>
            ) : (
              <Typography>Loading...</Typography>
            )}
            {sdoc.data && sdocData.data && sdoc.data.doctype === DocType.IMAGE ? (
              <img
                src={encodeURI("/content/" + sdocData.data.repo_url)}
                alt="Image Preview"
                style={{ maxWidth: "100%", marginTop: "10px" }}
              />
            ) : null}
          </CardContent>
        </Card>
      </Box>
    );
  } else {
    return null;
  }
}
