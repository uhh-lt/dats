import { Box, CircularProgress } from "@mui/material";
import { useParams } from "react-router-dom";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import SidebarContentLayout from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import ConceptList from "./ConceptList.tsx";
import TimeAnalysisProvenance from "./TimeAnalysisProvenance.tsx";
import TimelineAnalysisViz from "./TimeAnalysisViz.tsx";
import TimelineAnalysisSettings from "./TimelineAnalysisSettings.tsx";

function TimelineAnalysis() {
  // global client state
  const urlParams = useParams() as { projectId: string; analysisId: string };
  const projectId = parseInt(urlParams.projectId);
  const analysisId = parseInt(urlParams.analysisId);

  // global server state (react-query)
  const timelineAnalysis = TimelineAnalysisHooks.useGetTimelineAnalysis(analysisId);

  return (
    <>
      {timelineAnalysis.isSuccess ? (
        <TimelineAnalysisContent key={`${projectId}-${analysisId}`} timelineAnalysis={timelineAnalysis.data} />
      ) : timelineAnalysis.isLoading ? (
        <CircularProgress />
      ) : timelineAnalysis.isError ? (
        <div>ERROR: {timelineAnalysis.error.message}</div>
      ) : null}
    </>
  );
}

interface TimelineAnalysisContentProps {
  timelineAnalysis: TimelineAnalysisRead;
}

function TimelineAnalysisContent({ timelineAnalysis }: TimelineAnalysisContentProps) {
  return (
    <SidebarContentLayout
      leftSidebar={
        <Box className="myFlexContainer h100">
          <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
            <TimelineAnalysisSettings timelineAnalysis={timelineAnalysis} />
          </Box>
          <Box className="myFlexFillAllContainerNoScroll">
            <ConceptList timelineAnalysis={timelineAnalysis} />
          </Box>
        </Box>
      }
      content={
        <Box className="h100">
          <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
            <TimelineAnalysisViz timelineAnalysis={timelineAnalysis} />
          </Box>
          <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
            <TimeAnalysisProvenance timelineAnalysis={timelineAnalysis} />
          </Box>
        </Box>
      }
    />
  );
}

export default TimelineAnalysis;
