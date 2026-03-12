import { COTARead } from "@api/models/COTARead";
import { SidebarContentLayout } from "@components/content-layouts";
import { PercentageResizablePanel, useLayoutPercentage } from "@components/resizable-panels";
import { useAppSelector } from "@store/storeHooks";
import { CotaConceptList } from "./CotaConceptList";
import { CotaControl } from "./CotaControl";
import { CotaScatterPlotly } from "./CotaScatterPlotly";
import { CotaSentenceAnnotator2 } from "./CotaSentenceAnnotator";
import { CotaTimelinePlot } from "./CotaTimelinePlot";
import { CotaTimelineSettings } from "./CotaTimelineSettings";

interface CotaViewContentProps {
  cota: COTARead;
}

export function CotaViewContent({ cota }: CotaViewContentProps) {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);

  // vertical percentages
  const { percentage: sidebarPercentage, handleResize: handleSidebarResize } = useLayoutPercentage("cota-sidebar");
  const { percentage: mainPercentage, handleResize: handleMainResize } = useLayoutPercentage("cota-main-content");
  return (
    <SidebarContentLayout
      sidebar={
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
