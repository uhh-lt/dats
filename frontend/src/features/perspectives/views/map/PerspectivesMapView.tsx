import { getRouteApi } from "@tanstack/react-router";
import { SidebarContentSidebarLayout } from "../../../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { ClusterJobProgressDialog } from "../../components/ClusterJobProgressDialog.tsx";
import { ClusterDetailDialog } from "../../components/dialog/ClusterDetailDialog.tsx";
import { useInitPerspectivesFilterSlice } from "../../hooks/useInitPerspectivesFilterSlice.ts";
import { PerspectivesActions } from "../../store/perspectivesSlice.ts";
import { MapContent } from "./components/MapContent.tsx";
import { InfoPanel } from "./components/panel-info/InfoPanel.tsx";
import { SettingsPanel } from "./components/panel-settings/SettingsPanel.tsx";

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
