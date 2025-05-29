import { Box } from "@mui/material";
import { useParams } from "react-router";
import SidebarContentSidebarLayout from "../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { AtlasActions } from "./atlasSlice.ts";
import MapContent from "./MapContent.tsx";
import MapDetailsSidePanel from "./MapDetailsSidePanel.tsx";
import MapSettingsSidePanel from "./MapSettingsSidePanel.tsx";
import MapToolbar from "./MapToolbar.tsx";
import { useInitAtlasFilterSlice } from "./useInitAtlasFilterSlice.ts";

function Map() {
  const urlParams = useParams() as { projectId: string; aspectId: string };
  const projectId = parseInt(urlParams.projectId);
  const aspectId = parseInt(urlParams.aspectId);

  // initialize the filtering
  useInitAtlasFilterSlice({ projectId });

  // dispatch changeMap Event!
  const dispatch = useAppDispatch();
  dispatch(AtlasActions.onOpenMap({ projectId, atlasId: aspectId }));

  // render
  return (
    <SidebarContentSidebarLayout
      leftSidebar={<MapSettingsSidePanel aspectId={aspectId} />}
      content={
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <MapToolbar aspectId={aspectId} />
          <MapContent projectId={projectId} aspectId={aspectId} />
        </Box>
      }
      rightSidebar={<MapDetailsSidePanel aspectId={aspectId} />}
    />
  );
}

export default Map;
