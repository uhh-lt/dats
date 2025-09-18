import { Box } from "@mui/material";
import { memo, useMemo } from "react";
import CotaHooks from "../../../api/CotaHooks.ts";
import PerspectivesHooks from "../../../api/PerspectivesHooks.ts";
import SdocHooks from "../../../api/SdocHooks";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import WhiteboardHooks from "../../../api/WhiteboardHooks";
import { getIconComponent } from "../../../utils/icons/iconUtils";
import { LabelText, TabLabel } from "../styles/styledComponents.tsx";
import { TabData } from "../types/TabData.ts";

interface TabTitleProps {
  tab: TabData;
}

function getDefaultLabel(base: string): string {
  return base
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function TabTitle({ tab }: TabTitleProps) {
  const sdoc = SdocHooks.useGetDocument(tab.base === "annotation" ? parseInt(tab.data_id!) : undefined);
  const whiteboard = WhiteboardHooks.useGetWhiteboard(tab.base === "whiteboard" ? parseInt(tab.data_id!) : undefined);
  const cota = CotaHooks.useGetCota(tab.base === "concepts-over-time-analysis" ? parseInt(tab.data_id!) : undefined);
  const timeline = TimelineAnalysisHooks.useGetTimelineAnalysis(
    tab.base === "timeline" ? parseInt(tab.data_id!) : undefined,
  );
  const aspect = PerspectivesHooks.useGetAspect(
    tab.base === "map" || tab.base === "dashboard" ? parseInt(tab.data_id!) : undefined,
  );

  const label = useMemo(() => {
    if (!tab.data_id) {
      return getDefaultLabel(tab.base);
    }
    // Return appropriate title based on the base type and loaded data
    switch (tab.base) {
      case "annotation":
        return sdoc?.data?.name || `Document ${tab.data_id}`;
      case "whiteboard":
        return whiteboard?.data?.title || `Whiteboard ${tab.data_id}`;
      case "concepts-over-time-analysis":
        return cota?.data?.name || `COTA ${tab.data_id}`;
      case "timeline":
        return timeline?.data?.name || `Timeline ${tab.data_id}`;
      case "dashboard":
        return `${aspect?.data?.name} - Details`;
      case "map":
        return aspect?.data?.name || `Map ${tab.data_id}`;
      default:
        return getDefaultLabel(tab.base);
    }
  }, [
    tab.data_id,
    tab.base,
    sdoc.data?.name,
    whiteboard?.data?.title,
    cota?.data?.name,
    timeline?.data?.name,
    aspect?.data?.name,
  ]);

  return (
    <Box>
      <TabLabel>
        {tab.icon && getIconComponent(tab.icon)}
        <LabelText>{label}</LabelText>
      </TabLabel>
    </Box>
  );
}

export default memo(TabTitle);
