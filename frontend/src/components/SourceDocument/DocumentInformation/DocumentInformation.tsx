import AddCircleIcon from "@mui/icons-material/AddCircle";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Button, CircularProgress, List, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import SdocHooks from "../../../api/SdocHooks.ts";
import TagHooks from "../../../api/TagHooks.ts";
import TagMenuButton from "../../Tag/TagMenu/TagMenuButton.tsx";
import DocumentMemos from "./DocumentMemos.tsx";
import DocumentMetadataRow from "./DocumentMetadataRow/DocumentMetadataRow.tsx";
import DocumentTagRow from "./DocumentTagRow.tsx";
import MetadataCreateButton from "./MetadataCreateButton.tsx";
import SdocListItem from "./SdocListItem.tsx";

interface DocumentInformationProps {
  sdocId: number | undefined;
  isIdleContent?: React.ReactNode;
  filterName?: string;
}

export default function DocumentInformation({
  sdocId,
  isIdleContent,
  filterName,
  ...props
}: DocumentInformationProps & Omit<BoxProps, "className">) {
  // global server state (react-query)
  const metadata = SdocHooks.useGetMetadata(sdocId);
  const documentTagIds = TagHooks.useGetAllTagIdsBySdocId(sdocId);
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);

  // tabs
  const [tab, setTab] = useState("info");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // the queries are disabled if sdocId is undefined => show the idle content
  if (sdocId === undefined || sdocId === null) {
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Box className="myFlexContainer h100" {...props}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Info" value="info" />
            <Tab label="Tags" value="tags" />
            <Tab label="Links" value="links" />
            <Tab label="Memos" value="memos" />
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="info" sx={{ p: 1 }} className="h100">
            <MetadataCreateButton sdocId={sdocId} />
            <Stack direction="column" spacing={0.5}>
              {metadata.isLoading && (
                <Box textAlign={"center"} pt={2}>
                  <CircularProgress />
                </Box>
              )}
              {metadata.isError && <span>{metadata.error.message}</span>}
              {metadata.isSuccess &&
                metadata.data
                  .sort((a, b) => a.id - b.id)
                  .map((data) => <DocumentMetadataRow key={data.id} metadata={data} filterName={filterName} />)}
            </Stack>
          </TabPanel>
          <TabPanel value="tags" sx={{ p: 1 }} className="h100">
            <TagMenuButton
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
              type={"addBtn"}
              selectedSdocIds={[sdocId]}
            />
            <Stack direction="column" spacing={0.5}>
              {documentTagIds.isLoading && (
                <Box textAlign={"center"} pt={2}>
                  <CircularProgress />
                </Box>
              )}
              {documentTagIds.isError && <span>{documentTagIds.error.message}</span>}
              {documentTagIds.isSuccess &&
                documentTagIds.data.map((tagId) => (
                  <DocumentTagRow key={`sdoc-${sdocId}-tag${tagId}`} sdocId={sdocId} tagId={tagId} />
                ))}
            </Stack>
          </TabPanel>
          <TabPanel value="links" sx={{ p: 1 }} className="h100">
            <Button variant="text" size="small" startIcon={<AddCircleIcon />} disabled>
              Link documents
            </Button>
            <Stack direction="column" spacing={0.5}>
              {linkedSdocIds.isLoading && (
                <Box textAlign={"center"} pt={2}>
                  <CircularProgress />
                </Box>
              )}
              {linkedSdocIds.isError && <span>{linkedSdocIds.error.message}</span>}
              {linkedSdocIds.isSuccess && (
                <List>
                  {linkedSdocIds.data.map((sdocId) => (
                    <SdocListItem key={sdocId} sdocId={sdocId} />
                  ))}
                </List>
              )}
            </Stack>
          </TabPanel>
          <TabPanel value="memos" sx={{ p: 0 }} className="h100">
            <DocumentMemos sdocId={sdocId} key={sdocId} />
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}
