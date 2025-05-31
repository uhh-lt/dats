import { Box } from "@mui/material";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import MapPlot from "./MapPlot.tsx";
import MapToolbar from "./MapToolbar.tsx";

interface MapContentProps {
  aspectId: number;
}

function MapContent({ aspectId }: MapContentProps) {
  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MapToolbar aspectId={aspectId} />
      {vis.data && <MapPlot vis={vis.data} />}
    </Box>
  );
}

export default MapContent;
