import { ContentContainerLayout, SidebarContentSidebarLayout } from "@components/content-layouts";
import { useLiveJob } from "@core/job";
import { JobStatus } from "@models/JobStatus";
import { useAppDispatch } from "@store/storeHooks";
import { PerspectivesHooks } from "../../api/perspectivesHooks";
import { perspectivesQueries } from "../../api/perspectivesQueries";
import { ClusterJobProgressCard } from "../../_components/ClusterJobProgressCard";
import { ClusterDetailDialog } from "../../_components/dialog/ClusterDetailDialog";
import { PerspectivesActions } from "../../store/perspectivesSlice";
import { MapContent } from "./_components/MapContent";
import { InfoPanel } from "./_components/panel-info/InfoPanel";
import { SettingsPanel } from "./_components/panel-settings/SettingsPanel";
import { PerspectivesMapRouteAPI } from "./_hooks/perspectivesMapRouteAPI";

export function PerspectivesMapView() {
  const { projectId, aspectId } = PerspectivesMapRouteAPI.useParams();

  // dispatch changeMap Event!
  const dispatch = useAppDispatch();
  dispatch(PerspectivesActions.onOpenMap({ projectId, aspectId: aspectId }));

  // the map is outdated while the aspect's most recent job runs, so the job's progress replaces it
  const aspect = PerspectivesHooks.useGetAspect(aspectId);
  const job = useLiveJob(perspectivesQueries.job.byId(aspect.data?.most_recent_job_id));

  // render
  if (job.data && job.data.status !== JobStatus.FINISHED) {
    return (
      <ContentContainerLayout>
        <ClusterJobProgressCard perspectivesJob={job.data} />
      </ContentContainerLayout>
    );
  }
  return (
    <>
      <SidebarContentSidebarLayout
        leftSidebar={<SettingsPanel aspectId={aspectId} />}
        content={<MapContent aspectId={aspectId} />}
        rightSidebar={<InfoPanel projectId={projectId} aspectId={aspectId} />}
      />
      <ClusterDetailDialog aspectId={aspectId} />
    </>
  );
}
