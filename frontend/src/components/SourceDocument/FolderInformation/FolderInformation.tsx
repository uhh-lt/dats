import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import { memo, useState } from "react";
import FolderMetadataPanel from "./Info/FolderMetadataPanel.tsx";

interface FolderInformationProps {
  sdocFolderId: number;
  filterName: string;
}

function FolderInformation({
  sdocFolderId,
  filterName,
  ...props
}: FolderInformationProps & Omit<BoxProps, "className">) {
  // tabs
  const [tab, setTab] = useState("info");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  return (
    <Box className="myFlexContainer h100" {...props}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Info" value="info" />
            <Tab label="Tags" value="tags" />
            <Tab label="Memos" value="memos" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="info" sx={{ p: 0 }} className="h100">
            <FolderMetadataPanel sdocFolderId={sdocFolderId} filterName={filterName} />
          </TabPanel>
          <TabPanel value="tags" sx={{ p: 1 }} className="h100">
            Not implemented (yet)! This panel will show common tags of all documents in this folder.
          </TabPanel>
          <TabPanel value="memos" sx={{ p: 1 }} className="h100">
            Not implemented (yet)! This panel will show all memos assigned to documents in this folder.
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}

export default memo(FolderInformation);
