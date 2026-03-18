import { TimelineAnalysisRead } from "@api/models/TimelineAnalysisRead";
import { SidebarContentLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectTimelineAnalysisQueryOptions } from "../../_api/timelineAnalysisQueryOptions";
import { ConceptList } from "./_components/ConceptList";
import { TimeAnalysisProvenance } from "./_components/TimeAnalysisProvenance";
import { TimelineAnalysisViz } from "./_components/TimeAnalysisViz";
import { TimelineAnalysisSettings } from "./_components/TimelineAnalysisSettings";
import { TimelineAnalysisRouteAPI } from "./_hooks/timelineAnalysisRouteAPI";

export function TimelineAnalysisView() {
  const { projectId, analysisId } = TimelineAnalysisRouteAPI.useParams();

  const { data: timelineAnalysis } = useSuspenseQuery({
    ...projectTimelineAnalysisQueryOptions(projectId),
    select: (data) => data[analysisId],
  });

  return <TimelineAnalysisContent key={`${projectId}-${analysisId}`} timelineAnalysis={timelineAnalysis} />;
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
