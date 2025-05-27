import SidebarContentSidebarLayout from "../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import MapContent from "./MapContent.tsx";
import MapSidePanel from "./MapSidePanel.tsx";
import SelectionInformation from "./SelectionInformation.tsx";

function Map() {
  // render
  return (
    <SidebarContentSidebarLayout
      leftSidebar={<MapSidePanel />}
      content={<MapContent />}
      rightSidebar={<SelectionInformation />}
    />
  );
}

export default Map;
