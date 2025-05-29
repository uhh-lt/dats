import { TabContext, TabPanel } from "@mui/lab";
import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import AnalysisAssistant from "./AnalysisAssistant.tsx";
import PositionSettings from "./PositionSettings.tsx";
import ViewSettings from "./ViewSettings.tsx";

interface MapSettingsSidePanelProps {
  aspectId: number;
}

function MapSettingsSidePanel({ aspectId }: MapSettingsSidePanelProps) {
  // explorer
  const [tab, setTab] = useState("view");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };
  return (
    <Box className="h100 myFlexContainer">
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="View Settings" value="view" />
            <Tab label="Position Settings" value="position" />
            <Tab label="Analysis Assistant" value="assistant" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="view" style={{ padding: 0 }} className="h100">
            {tab === "view" && <ViewSettings aspectId={aspectId} />}
          </TabPanel>
          <TabPanel value="position" style={{ padding: 0 }} className="h100">
            {tab === "position" && <PositionSettings />}
          </TabPanel>
          <TabPanel value="assistant" style={{ padding: 0 }} className="h100">
            {tab === "assistant" && <AnalysisAssistant />}
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}

export default MapSettingsSidePanel;
