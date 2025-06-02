import { useParams } from "react-router";
import SidebarContentSidebarLayout from "../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { AtlasActions } from "./atlasSlice.ts";
import MapContent from "./MapContent.tsx";
import MapDetailsSidePanel from "./MapDetailsSidePanel.tsx";
import MapSettingsSidePanel from "./MapSettingsSidePanel.tsx";
import TMJobProgressDialog from "./TMJobProgressDialog.tsx";
import TopicDetailDialog from "./TopicDetailDialog.tsx";
import { useInitAtlasFilterSlice } from "./useInitAtlasFilterSlice.ts";

function Map() {
  const urlParams = useParams() as { projectId: string; aspectId: string };
  const projectId = parseInt(urlParams.projectId);
  const aspectId = parseInt(urlParams.aspectId);

  // initialize the filtering
  useInitAtlasFilterSlice({ projectId });

  // dispatch changeMap Event!
  const dispatch = useAppDispatch();
  dispatch(AtlasActions.onOpenMap({ projectId, aspectId: aspectId }));

  // render
  return (
    <>
      <SidebarContentSidebarLayout
        leftSidebar={<MapSettingsSidePanel aspectId={aspectId} />}
        content={<MapContent aspectId={aspectId} />}
        rightSidebar={<MapDetailsSidePanel projectId={projectId} aspectId={aspectId} />}
      />
      <TMJobProgressDialog aspectId={aspectId} />
      <TopicDetailDialog aspectId={aspectId} />
    </>
  );
}

export default Map;
