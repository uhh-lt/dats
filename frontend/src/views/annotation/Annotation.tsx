import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Grid, Portal, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useContext, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks";
import { DocType, DocumentTagRead } from "../../api/openapi";
import DocumentExplorer from "../../features/DocumentExplorer/DocumentExplorer";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import DocumentMetadata from "../search/DocumentViewer/DocumentMetadata/DocumentMetadata";
import EditableDocumentName, {
  EditableDocumentNameHandle,
} from "../../components/EditableDocumentName/EditableDocumentName";
import DocumentTagChip from "../search/DocumentViewer/DocumentTagChip";
import { useDeletableDocumentTags } from "../search/DocumentViewer/useDeletableDocumentTags";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector";
import CodeExplorer from "./CodeExplorer/CodeExplorer";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator";
import MemoExplorer from "./MemoExplorer/MemoExplorer";
import TextAnnotator from "./TextAnnotator/TextAnnotator";
import { useSelectOrCreateCurrentUsersAnnotationDocument } from "./useSelectOrCreateCurrentUsersAnnotationDocument";
import EditableDocumentNameButton from "../../components/EditableDocumentName/EditableDocumentNameButton";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;

  // local state
  const editableDocumentNameHandle = useRef<EditableDocumentNameHandle>(null);

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
  const metadata = SdocHooks.useGetMetadata(sourceDocumentId);
  const annotationDocument = useSelectOrCreateCurrentUsersAnnotationDocument(sourceDocumentId);
  const { documentTags, handleDeleteDocumentTag } = useDeletableDocumentTags(sourceDocumentId);

  // tabs
  const [tab, setTab] = useState("code");
  const handleTabChange = (event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {sourceDocument.isSuccess ? `Annotator: ${sourceDocument.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      <Grid container className="h100">
        <Grid
          item
          md={3}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderRight: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <DocumentExplorer sx={{ overflow: "auto", height: "100%" }} />
        </Grid>
        <Grid
          item
          md={6}
          className="h100 myFlexContainer"
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
        >
          {/* <AnnotationDocumentSelector className="myFlexFitContentContainer" sdocId={sourceDocumentId} /> */}
          <Container className="myFlexFillAllContainer" sx={{ py: 2, overflowY: "auto" }}>
            <Card raised>
              <CardContent>
                {sdocId ? (
                  <>
                    {sourceDocument.isSuccess && annotationDocument && metadata.isSuccess ? (
                      <>
                        <Stack spacing={2}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <EditableDocumentName
                              sdocId={sourceDocument.data.id}
                              variant={"h4"}
                              style={{ margin: 0 }}
                              inputProps={{ style: { fontSize: "2.125rem", padding: 0, width: "auto" } }}
                              ref={editableDocumentNameHandle}
                            />
                            <EditableDocumentNameButton
                              editableDocumentNameHandle={editableDocumentNameHandle.current}
                              sx={{ ml: 1 }}
                            />
                          </div>
                          <div>
                            {documentTags.isLoading && <span>Loading tags...</span>}
                            {documentTags.isError && <span>{documentTags.error.message}</span>}
                            {documentTags.isSuccess &&
                              documentTags.data.map((tag: DocumentTagRead) => (
                                <DocumentTagChip key={tag.id} tagId={tag.id} handleDelete={handleDeleteDocumentTag} />
                              ))}
                          </div>
                          <Box>
                            <DocumentMetadata sdocId={sourceDocumentId} metadata={metadata} />
                            <AnnotationDocumentSelector sdocId={sourceDocumentId} />
                          </Box>
                          {sourceDocument.data.doctype === DocType.IMAGE ? (
                            <ImageAnnotator
                              sdoc={sourceDocument.data}
                              adoc={annotationDocument}
                              height={parseInt(metadata.data.get("height")!.value)}
                            />
                          ) : sourceDocument.data.doctype === DocType.TEXT ? (
                            <TextAnnotator sdoc={sourceDocument.data} adoc={annotationDocument} />
                          ) : (
                            <div>ERROR! This DocType is not (yet) supported!</div>
                          )}
                        </Stack>
                      </>
                    ) : sourceDocument.isError ? (
                      <div>Error: {sourceDocument.error.message}</div>
                    ) : (
                      <div>Loading...</div>
                    )}
                  </>
                ) : (
                  <div>Please select a document from the Document Explorer :)</div>
                )}
              </CardContent>
            </Card>
          </Container>
        </Grid>
        <Grid
          item
          md={3}
          className="h100 myFlexContainer"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderLeft: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
              <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
                <Tab label="Code Explorer" value="code" />
                <Tab label="Memo Explorer" value="memo" />
              </Tabs>
            </Box>
            <Box className="myFlexFillAllContainer">
              <TabPanel value="code" style={{ padding: 0 }} className="h100">
                <CodeExplorer showButtons={true} />
              </TabPanel>
              <TabPanel value="memo" style={{ padding: 0 }} className="h100">
                <MemoExplorer sdocId={sourceDocumentId} />
              </TabPanel>
            </Box>
          </TabContext>
        </Grid>
      </Grid>
    </>
  );
}

export default Annotation;
