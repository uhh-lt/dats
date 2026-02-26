import { Box } from "@mui/material";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import PerspectivesHistory from "../components/PerspectivesHistory.tsx";
import MapPlot from "./MapPlot.tsx";
import MapToolbar from "./toolbar/MapToolbar.tsx";

interface MapContentProps {
  aspectId: number;
}

function MapContent({ aspectId }: MapContentProps) {
  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MapToolbar aspectId={aspectId} />
      {vis.isSuccess && <MapPlot vis={vis.data} />}
      <PerspectivesHistory aspectId={aspectId} />
    </Box>
  );
}

export default MapContent;
