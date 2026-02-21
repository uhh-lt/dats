import { TabContext, TabPanel } from "@mui/lab";
import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { AnalysisAssistant } from "./AnalysisAssistant.tsx";
import { ColorSettings } from "./ColorSettings.tsx";
import { PositionSettings } from "./PositionSettings.tsx";

interface SettingsPanelProps {
  aspectId: number;
}

export function SettingsPanel({ aspectId }: SettingsPanelProps) {
  // explorer
  const [tab, setTab] = useState("color");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };
  return (
    <Box className="h100 myFlexContainer">
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Color Settings" value="color" />
            <Tab label="Position Settings" value="position" />
            <Tab label="Analysis Assistant" value="assistant" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="color" style={{ padding: 0 }} className="h100">
            {tab === "color" && <ColorSettings aspectId={aspectId} />}
          </TabPanel>
          <TabPanel value="position" style={{ padding: 0 }} className="h100">
            {tab === "position" && <PositionSettings aspectId={aspectId} />}
          </TabPanel>
          <TabPanel value="assistant" style={{ padding: 0 }} className="h100">
            {tab === "assistant" && <AnalysisAssistant />}
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}
