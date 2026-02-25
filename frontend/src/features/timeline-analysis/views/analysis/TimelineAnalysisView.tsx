import { CircularProgress } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { TimelineAnalysisHooks } from "../../../../api/TimelineAnalysisHooks";
import { TimelineAnalysisRead } from "../../../../api/openapi/models/TimelineAnalysisRead";
import { SidebarContentLayout } from "../../../../components/content-layouts/SidebarContentLayout";
import { PercentageResizablePanel } from "../../../../components/resizable-panels/PercentageResizablePanel";
import { useLayoutPercentage } from "../../../../components/resizable-panels/useLayoutPercentage";
import { ConceptList } from "./_components/ConceptList";
import { TimeAnalysisProvenance } from "./_components/TimeAnalysisProvenance";
import { TimelineAnalysisViz } from "./_components/TimeAnalysisViz";
import { TimelineAnalysisSettings } from "./_components/TimelineAnalysisSettings";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/timeline/$analysisId");

export function TimelineAnalysisView() {
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
  const { percentage: leftPercentage, handleResize: handleLeftResize } =
    useLayoutPercentage("timeline-analysis-sidebar");
  const { percentage: mainPercentage, handleResize: handleMainResize } =
    useLayoutPercentage("timeline-analysis-content");

  return (
    <SidebarContentLayout
      sidebar={
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
