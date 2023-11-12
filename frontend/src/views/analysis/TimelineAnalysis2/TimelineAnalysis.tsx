import { Box, Grid, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import ConceptList from "./ConceptList";
import TimeAnalysisProvenance from "./TimeAnalysisProvenance";
import TimelineAnalysisViz from "./TimeAnalysisViz";
import TimelineAnalysisSettings from "./TimelineAnalysisSettings";
import { useTimelineAnalysis } from "./useTimelineAnalysis";
import { useAppSelector } from "../../../plugins/ReduxHooks";

function TimelineAnalysis() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (redux)
  const concepts = useAppSelector((state) => state.timelineAnalysis.concepts);

  // custom hooks
  const anaylsisResults = useTimelineAnalysis();

  console.log(anaylsisResults);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Timeline Analysis
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={3} className="myFlexContainer h100">
          <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
            <TimelineAnalysisSettings />
          </Box>
          <Box className="myFlexFillAllContainerNoScroll">
            <ConceptList />
          </Box>
        </Grid>
        <Grid item md={9} className="h100">
          <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
            <TimelineAnalysisViz
              chartData={anaylsisResults.isSuccess ? anaylsisResults.counts : undefined}
              concepts={concepts.filter((c) => c.visible)}
            />
          </Box>
          <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
            <TimeAnalysisProvenance provenanceData={anaylsisResults.date2concept2ids} />
          </Box>
        </Grid>
      </Grid>
    </>
  );
}

export default TimelineAnalysis;
