import { getRouteApi } from "@tanstack/react-router";
import SidebarContentSidebarLayout from "../../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import ClusterJobProgressDialog from "../components/ClusterJobProgressDialog.tsx";
import ClusterDetailDialog from "../dialog/ClusterDetailDialog.tsx";
import { PerspectivesActions } from "../perspectivesSlice.ts";
import { useInitPerspectivesFilterSlice } from "../useInitPerspectivesFilterSlice.ts";
import MapContent from "./MapContent.tsx";
import InfoPanel from "./PanelInfo/InfoPanel.tsx";
import SettingsPanel from "./PanelSettings/SettingsPanel.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/perspectives/$aspectId/map");

function Map() {
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

export default Map;
