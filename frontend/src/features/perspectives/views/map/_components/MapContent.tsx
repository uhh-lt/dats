import { Box } from "@mui/material";
import { useGetDocVisualization } from "../../../_api/useGetDocVisualization";
import { MapPlot } from "./MapPlot";
import { MapToolbar } from "./toolbar/MapToolbar";

interface MapContentProps {
  aspectId: number;
}

export function MapContent({ aspectId }: MapContentProps) {
  // global server state
  const vis = useGetDocVisualization(aspectId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MapToolbar aspectId={aspectId} />
      {vis.isSuccess && <MapPlot vis={vis.data} />}
    </Box>
  );
}
