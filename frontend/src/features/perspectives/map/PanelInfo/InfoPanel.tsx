import { TabContext, TabPanel } from "@mui/lab";
import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { SelectionInformation } from "./SelectionInformation.tsx";
import { SelectionStatistics } from "./statistics/SelectionStatistics.tsx";

interface InfoPanelProps {
  aspectId: number;
  projectId: number;
}

export function InfoPanel({ aspectId, projectId }: InfoPanelProps) {
  // explorer
  const [tab, setTab] = useState("info");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };
  return (
    <Box className="h100 myFlexContainer">
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Document Information" value="info" />
            <Tab label="Statistics" value="statistics" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="info" style={{ padding: 0 }} className="h100">
            {tab === "info" && <SelectionInformation aspectId={aspectId} />}
          </TabPanel>
          <TabPanel value="statistics" style={{ padding: 0 }} className="h100">
            {tab === "statistics" && <SelectionStatistics aspectId={aspectId} projectId={projectId} />}
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}
