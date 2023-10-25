import { Box, Grid, Portal, Typography } from "@mui/material";
import TimelineAnalysisSettings from "./TimelineAnalysisSettings";
import TimelineAnalysisConcepts from "./TimelineAnalysisConcepts";
import TimelineAnalysisConceptEditor from "./TimeAnalysisConceptEditor";
import TimelineAnalysisViz from "./TimeAnalysisViz";
import TimeAnalysisProvenance from "./TimeAnalysisProvenance";
import { useContext, useMemo } from "react";
import AnalysisHooks from "../../../api/AnalysisHooks";
import { TimelineAnalysisResult } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useParams } from "react-router-dom";
import TimelineAnalysisMetadataChecker from "./TimeAnalysisMetadataChecker";
import { AppBarContext } from "../../../layouts/TwoBarLayout";

function TimelineAnalysis() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const { projectId } = useParams<{ projectId: string }>();

  // global client state (redux)
  const groupBy = useAppSelector((state) => state.analysis.groupBy);
  const metadataKey = useAppSelector((state) => state.analysis.metadataKey);
  const threshold = useAppSelector((state) => state.analysis.threshold);
  const concepts = useAppSelector((state) => state.analysis.concepts);

  // global server state (react query)
  const analysisResults = AnalysisHooks.useTimelineAnalysis(
    parseInt(projectId!),
    metadataKey,
    threshold / 100.0,
    concepts.map((c) => {
      return {
        name: c.name,
        sentences: c.data,
      };
    })
  );
  const isValidInput = metadataKey.length > 0 && concepts.length > 0;

  // computed
  const { chartData, provenanceData } = useMemo(() => {
    if (!analysisResults.data) return { chartData: undefined, provenanceData: {} };

    // group analysisResults by date
    const groupedByDate: Record<string, TimelineAnalysisResult[]> = {};
    analysisResults.data.forEach((d) => {
      const date = new Date(Date.parse(d.date));
      let groupByString = `${date.getFullYear()}`;
      if (groupBy === "month" || groupBy === "day") groupByString += `-${date.getMonth() + 1}`;
      if (groupBy === "day") groupByString += `-${date.getDate()}`;
      if (!groupedByDate[groupByString]) {
        groupedByDate[groupByString] = [];
      }
      groupedByDate[groupByString].push(d);
    });

    // construct result
    const chartData: any[] = [];
    const provenanceData: Record<string, Record<string, TimelineAnalysisResult[]>> = {};
    Object.entries(groupedByDate).forEach(([date, data]) => {
      // group data by concept
      const groupedByConceptCount: Record<string, number> = {};
      const groupedByConcept: Record<string, TimelineAnalysisResult[]> = {};
      concepts.forEach((c) => {
        groupedByConceptCount[c.name] = 0;
        groupedByConcept[c.name] = [];
      });
      data.forEach((d) => {
        const concept = d.concept_name;
        groupedByConceptCount[concept] += 1;
        groupedByConcept[concept].push(d);
      });

      chartData.push({
        ...groupedByConceptCount,
        date: date,
      });

      provenanceData[date] = groupedByConcept;
    });

    chartData.sort((a, b) => {
      const dateA = Date.parse(a.date);
      const dateB = Date.parse(b.date);
      return dateA - dateB;
    });

    return { chartData, provenanceData };
  }, [analysisResults.data, concepts, groupBy]);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Frequency Analysis
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={3} className="myFlexContainer h100">
          <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
            <TimelineAnalysisSettings />
          </Box>
          <Box className="myFlexFillAllContainerNoScroll">
            <TimelineAnalysisConcepts />
          </Box>
        </Grid>
        <Grid item md={9} className="h100">
          <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
            <TimelineAnalysisViz
              chartData={isValidInput ? chartData : []}
              concepts={concepts.filter((c) => c.visible)}
            />
          </Box>
          <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
            <TimeAnalysisProvenance provenanceData={provenanceData} />
          </Box>
        </Grid>
      </Grid>
      <TimelineAnalysisConceptEditor />
      <TimelineAnalysisMetadataChecker projectId={parseInt(projectId!)} />
    </>
  );
}

export default TimelineAnalysis;
