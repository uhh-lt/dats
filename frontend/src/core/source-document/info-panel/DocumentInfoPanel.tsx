import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { DocumentMemos } from "./_components/memo-panel/DocumentMemos";
import { MetadataPanel } from "./_components/metadata-panel/MetadataPanel";
import { RelatedPanel } from "./_components/related-panel/RelatedPanel";
import { TagPanel } from "./_components/tags-panel/TagPanel";

interface DocumentInformationProps {
  sdocId: number | undefined;
  isIdleContent?: React.ReactNode;
  filterName: string;
}

export function DocumentInfoPanel({
  sdocId,
  isIdleContent,
  filterName,
  ...props
}: DocumentInformationProps & Omit<BoxProps, "className">) {
  // tabs
  const [tab, setTab] = useState("info");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // the queries are disabled if sdocId is undefined => show the idle content
  if (sdocId === undefined || sdocId === null) {
    return (
      <Box className="h100" {...props}>
        {isIdleContent}
      </Box>
    );
  }

  return (
    <Box className="myFlexContainer h100" {...props}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Info" value="info" />
            <Tab label="Tags" value="tags" />
            <Tab label="Related" value="related" />
            <Tab label="Memos" value="memos" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <MetadataPanel currentTab={tab} sdocId={sdocId} filterName={filterName} />
          <TagPanel currentTab={tab} sdocId={sdocId} />
          <RelatedPanel currentTab={tab} sdocId={sdocId} />
          <TabPanel value="memos" sx={{ p: 0 }} className="h100">
            <DocumentMemos sdocId={sdocId} key={sdocId} />
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}
