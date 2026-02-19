import { CircularProgress } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import SidebarContentLayout from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import PercentageResizablePanel from "../../../layouts/ResizePanel/PercentageResizablePanel.tsx";
import { useLayoutPercentage } from "../../../layouts/ResizePanel/hooks/useLayoutPercentage.ts";
import { LayoutPercentageKeys } from "../../../layouts/layoutSlice.ts";
import ConceptList from "./ConceptList.tsx";
import TimeAnalysisProvenance from "./TimeAnalysisProvenance.tsx";
import TimelineAnalysisViz from "./TimeAnalysisViz.tsx";
import TimelineAnalysisSettings from "./TimelineAnalysisSettings.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/timeline/$analysisId");

function TimelineAnalysis() {
  // global client state
  const { projectId, analysisId } = routeApi.useParams();

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
  const { percentage: leftPercentage, handleResize: handleLeftResize } = useLayoutPercentage(
    LayoutPercentageKeys.TimelineSidebar,
  );
  const { percentage: mainPercentage, handleResize: handleMainResize } = useLayoutPercentage(
    LayoutPercentageKeys.TimelineContent,
  );

  return (
    <SidebarContentLayout
      leftSidebar={
        <PercentageResizablePanel
          firstContent={<TimelineAnalysisSettings timelineAnalysis={timelineAnalysis} />}
          secondContent={<ConceptList timelineAnalysis={timelineAnalysis} />}
          onResize={handleLeftResize}
          contentPercentage={leftPercentage}
        />
      }
      content={
        <PercentageResizablePanel
          firstContent={<TimelineAnalysisViz timelineAnalysis={timelineAnalysis} />}
          secondContent={<TimeAnalysisProvenance timelineAnalysis={timelineAnalysis} />}
          onResize={handleMainResize}
          contentPercentage={mainPercentage}
        />
      }
    />
  );
}

export default TimelineAnalysis;
