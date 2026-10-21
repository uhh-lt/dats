import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { useAppDispatch } from "@store/storeHooks";
import { ClusterJobProgressDialog } from "../../_components/ClusterJobProgressDialog";
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
