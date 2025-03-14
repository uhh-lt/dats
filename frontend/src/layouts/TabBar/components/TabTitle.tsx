import { Box } from "@mui/material";
import { useMemo } from "react";

import CotaHooks from "../../../api/CotaHooks.ts";
import SdocHooks from "../../../api/SdocHooks";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import WhiteboardHooks from "../../../api/WhiteboardHooks";
import { getIconComponent } from "../../../utils/icons/iconUtils";
import { LabelText, TabLabel } from "../styles";
import { TabData } from "../types";

interface TabTitleProps {
  tab: TabData;
}

function getDefaultLabel(base: string): string {
  return base
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TabTitle({ tab }: TabTitleProps) {
  console.log(tab);

  // Only fetch data if we have an ID and it's a type we need to fetch for
  const sdoc = SdocHooks.useGetDocument(tab.base === "annotation" ? parseInt(tab.data_id!) : undefined);

  console.log(sdoc);

  const whiteboard = WhiteboardHooks.useGetWhiteboard(tab.base === "whiteboard" ? parseInt(tab.data_id!) : undefined);

  const cota = CotaHooks.useGetCota(tab.base === "concepts-over-time-analysis" ? parseInt(tab.data_id!) : undefined);

  const timeline = TimelineAnalysisHooks.useGetTimelineAnalysis(
    tab.base === "timeline" ? parseInt(tab.data_id!) : undefined,
  );

  const label = useMemo(() => {
    if (!tab.data_id) {
      return getDefaultLabel(tab.base);
    }

    // Return appropriate title based on the base type and loaded data
    switch (tab.base) {
      case "annotation":
        return sdoc?.data?.name || sdoc.data?.filename || `Document ${tab.data_id}`;
      case "whiteboard":
        return whiteboard?.data?.title || `Whiteboard ${tab.data_id}`;
      case "concepts-over-time-analysis":
        return cota?.data?.name || `COTA ${tab.data_id}`;
      case "timeline":
        return timeline?.data?.name || `Timeline ${tab.data_id}`;
      default:
        return getDefaultLabel(tab.base);
    }
  }, [tab, sdoc?.data, whiteboard?.data?.title, cota?.data?.name, timeline?.data?.name]);

  return (
    <Box>
      <TabLabel>
        {tab.icon && getIconComponent(tab.icon)}
        <LabelText>{label}</LabelText>
      </TabLabel>
    </Box>
  );
}
