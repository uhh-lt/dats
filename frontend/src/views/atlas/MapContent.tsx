import { Box } from "@mui/material";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import MapPlot from "./MapPlot.tsx";
import MapToolbar from "./MapToolbar.tsx";
import TMJobProgressDialog from "./TMJobProgressDialog.tsx";

interface MapContentProps {
  aspectId: number;
  projectId: number;
}

function MapContent({ aspectId, projectId }: MapContentProps) {
  console.log("projectId", projectId);

  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const aspect = TopicModellingHooks.useGetAspect(aspectId);
  const mostRecentJob = TopicModellingHooks.usePollTMJob(aspect.data?.most_recent_job_id, undefined);

  if (!vis.data || !aspect.data) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MapToolbar aspectId={aspectId} />
      <MapPlot vis={vis.data} />
      <TMJobProgressDialog job={mostRecentJob.data} />
    </Box>
  );
}

export default MapContent;
