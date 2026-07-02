import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { useAppDispatch } from "@store/storeHooks";
import { getRouteApi } from "@tanstack/react-router";
import { ClusterJobProgressDialog } from "../../_components/ClusterJobProgressDialog";
import { ClusterDetailDialog } from "../../_components/dialog/ClusterDetailDialog";
import { useInitPerspectivesFilterSlice } from "../../_hooks/useInitPerspectivesFilterSlice";
import { PerspectivesActions } from "../../store/perspectivesSlice";
import { MapContent } from "./_components/MapContent";
import { InfoPanel } from "./_components/panel-info/InfoPanel";
import { SettingsPanel } from "./_components/panel-settings/SettingsPanel";

const routeApi = getRouteApi("/_auth/project/$projectId/perspectives/$aspectId/map");

export function PerspectivesMapView() {
  const { projectId, aspectId } = routeApi.useParams();

  // initialize the filtering
  useInitPerspectivesFilterSlice({ projectId });

  // dispatch changeMap Event!
  const dispatch = useAppDispatch();
  dispatch(PerspectivesActions.onOpenMap({ projectId, aspectId: aspectId }));

  // render
  return (
    <>
      <SidebarContentSidebarLayout
        leftSidebar={<SettingsPanel aspectId={aspectId} />}
        content={<MapContent aspectId={aspectId} />}
        rightSidebar={<InfoPanel projectId={projectId} aspectId={aspectId} />}
      />
      <ClusterJobProgressDialog aspectId={aspectId} />
      <ClusterDetailDialog aspectId={aspectId} />
    </>
  );
}
