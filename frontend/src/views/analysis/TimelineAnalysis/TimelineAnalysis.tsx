import { Box, CircularProgress, Grid2, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { AppBarContext } from "../../../layouts/AppBarContext.ts";
import ConceptList from "./ConceptList.tsx";
import TimeAnalysisProvenance from "./TimeAnalysisProvenance.tsx";
import TimelineAnalysisViz from "./TimeAnalysisViz.tsx";
import TimelineAnalysisSettings from "./TimelineAnalysisSettings.tsx";

function TimelineAnalysis() {
  // global client state
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; analysisId: string };
  const projectId = parseInt(urlParams.projectId);
  const analysisId = parseInt(urlParams.analysisId);

  // global server state (react-query)
  const timelineAnalysis = TimelineAnalysisHooks.useGetTimelineAnalysis(analysisId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          {timelineAnalysis.data?.name || ""}
        </Typography>
      </Portal>
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
    <Grid2 container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
      <Grid2 size={{ md: 3 }} className="myFlexContainer h100">
        <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
          <TimelineAnalysisSettings timelineAnalysis={timelineAnalysis} />
        </Box>
        <Box className="myFlexFillAllContainerNoScroll">
          <ConceptList timelineAnalysis={timelineAnalysis} />
        </Box>
      </Grid2>
      <Grid2 size={{ md: 9 }} className="h100">
        <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
          <TimelineAnalysisViz timelineAnalysis={timelineAnalysis} />
        </Box>
        <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
          <TimeAnalysisProvenance timelineAnalysis={timelineAnalysis} />
        </Box>
      </Grid2>
    </Grid2>
  );
}

export default TimelineAnalysis;
