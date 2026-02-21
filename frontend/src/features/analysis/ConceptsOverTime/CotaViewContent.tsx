import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { SidebarContentLayout } from "../../../layouts/ContentLayouts/SidebarContentLayout.tsx";
import { LayoutPercentageKeys } from "../../../layouts/layoutSlice.ts";
import { useLayoutPercentage } from "../../../layouts/ResizePanel/hooks/useLayoutPercentage.ts";
import { PercentageResizablePanel } from "../../../layouts/ResizePanel/PercentageResizablePanel.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CotaConceptList } from "./CotaConceptList.tsx";
import { CotaControl } from "./CotaControl.tsx";
import { CotaScatterPlotly } from "./CotaScatterPlotly.tsx";
import { CotaSentenceAnnotator2 } from "./CotaSentenceAnnotator.tsx";
import { CotaTimelinePlot } from "./CotaTimelinePlot.tsx";
import { CotaTimelineSettings } from "./CotaTimelineSettings.tsx";

interface CotaViewContentProps {
  cota: COTARead;
}

export function CotaViewContent({ cota }: CotaViewContentProps) {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);

  // vertical percentages
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } = useLayoutPercentage(
    LayoutPercentageKeys.CotaSidebar,
  );
  const { percentage: mainPercentage, handleResize: handleMainResize } = useLayoutPercentage(
    LayoutPercentageKeys.CotaContent,
  );
  return (
    <SidebarContentLayout
      leftSidebar={
        <PercentageResizablePanel
          firstContent={isTimelineView ? <CotaTimelineSettings cota={cota} /> : <CotaControl cota={cota} />}
          secondContent={<CotaConceptList cota={cota} />}
          contentPercentage={sidebarPercentage}
          onResize={handleSidebarResize}
        />
      }
      content={
        <PercentageResizablePanel
          firstContent={isTimelineView ? <CotaTimelinePlot cota={cota} /> : <CotaScatterPlotly cota={cota} />}
          secondContent={<CotaSentenceAnnotator2 cota={cota} />}
          onResize={handleMainResize}
          contentPercentage={mainPercentage}
        />
      }
    />
  );
}
