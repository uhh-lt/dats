import AddCircleIcon from "@mui/icons-material/AddCircle";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Button, CircularProgress, List, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import MemoAPI from "../../../../features/Memo/MemoAPI.ts";
import MemoCard from "../../../../features/Memo/MemoCard/MemoCard.tsx";
import TagMenuButton from "../../ToolBar/ToolBarElements/TagMenu/TagMenuButton.tsx";
import DocumentMetadataRow from "../DocumentMetadata/DocumentMetadataRow.tsx";
import DocumentTagRow from "./DocumentTagRow.tsx";
import SdocListItem from "./SdocListItem.tsx";

interface DocumentInformationProps {
  sdocId: number | undefined;
  isIdleContent?: React.ReactNode;
}

export default function DocumentInformation({ sdocId, isIdleContent, ...props }: DocumentInformationProps & BoxProps) {
  // global client state (context)
  const { user } = useAuth();

  // global server state (react-query)
  const metadata = SdocHooks.useGetMetadata(sdocId);
  const documentTags = SdocHooks.useGetAllDocumentTags(sdocId);
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);
  const memos = SdocHooks.useGetRelatedMemos(sdocId, user?.id);

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
            <Button variant="text" size="small" startIcon={<AddCircleIcon />} disabled>
              Add Metadata
            </Button>
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
                  .map((data) => <DocumentMetadataRow key={data.id} metadata={data} />)}
            </Stack>
          </TabPanel>
          <TabPanel value="tags" sx={{ p: 1 }} className="h100">
            <TagMenuButton
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
              type={"addBtn"}
              forceSdocId={sdocId}
            />
            <Stack direction="column" spacing={0.5}>
              {documentTags.isLoading && (
                <Box textAlign={"center"} pt={2}>
                  <CircularProgress />
                </Box>
              )}
              {documentTags.isError && <span>{documentTags.error.message}</span>}
              {documentTags.isSuccess &&
                documentTags.data.map((tag: DocumentTagRead) => (
                  <DocumentTagRow key={`sdoc-${sdocId}-tag${tag.id}`} sdocId={sdocId} tag={tag} />
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
          <TabPanel value="memos" sx={{ p: 1 }} className="h100">
            {memos.isLoading && (
              <Box textAlign={"center"} pt={2}>
                <CircularProgress />
              </Box>
            )}
            {memos.isError && <span>{memos.error.message}</span>}
            {memos.isSuccess && (
              <>
                {memos.data.filter((memo) => memo.attached_object_type === AttachedObjectType.SOURCE_DOCUMENT)
                  .length === 0 && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<AddCircleIcon />}
                    sx={{ mb: 1 }}
                    onClick={() =>
                      MemoAPI.openMemo({
                        attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT,
                        attachedObjectId: sdocId,
                      })
                    }
                  >
                    Add Document Memo
                  </Button>
                )}
                <Stack direction="column" spacing={0.5}>
                  {memos.data.map((memo) => (
                    <MemoCard memo={memo} />
                  ))}
                </Stack>
              </>
            )}
          </TabPanel>
        </Box>
      </TabContext>
    </Box>
  );
}
