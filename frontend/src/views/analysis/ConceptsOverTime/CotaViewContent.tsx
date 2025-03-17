import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import SidebarContentLayout from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import { useVerticalPercentage } from "../../../layouts/ResizePanel/hooks/useVerticalPercentage.ts";
import { VerticalPercentageResizablePanel } from "../../../layouts/ResizePanel/VerticalPercentageResizablePanel.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import CotaConceptList from "./CotaConceptList.tsx";
import CotaControl from "./CotaControl.tsx";
import CotaScatterPlotly from "./CotaScatterPlotly.tsx";
import CotaSentenceAnnotator2 from "./CotaSentenceAnnotator.tsx";
import CotaTimelinePlot from "./CotaTimelinePlot.tsx";
import CotaTimelineSettings from "./CotaTimelineSettings.tsx";

interface CotaViewContentProps {
  cota: COTARead;
}

function CotaViewContent({ cota }: CotaViewContentProps) {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);

  // vertical percentages
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } =
    useVerticalPercentage("cota-left-sidebar");
  const { percentage: mainPercentage, handleResize: handleMainResize } = useVerticalPercentage("cota-main-content");
  return (
    <SidebarContentLayout
      leftSidebar={
        <VerticalPercentageResizablePanel
          topContent={isTimelineView ? <CotaTimelineSettings cota={cota} /> : <CotaControl cota={cota} />}
          bottomContent={<CotaConceptList cota={cota} />}
          verticalContentPercentage={sidebarPercentage}
          onResize={handleSidebarResize}
        />
      }
      content={
        <VerticalPercentageResizablePanel
          topContent={isTimelineView ? <CotaTimelinePlot cota={cota} /> : <CotaScatterPlotly cota={cota} />}
          bottomContent={<CotaSentenceAnnotator2 cota={cota} />}
          onResize={handleMainResize}
          verticalContentPercentage={mainPercentage}
        />
      }
    />
  );
}

export default CotaViewContent;
