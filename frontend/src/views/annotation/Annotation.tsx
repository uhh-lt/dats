import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Grid, Portal, Stack, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { useContext, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { useAuth } from "../../auth/useAuth.ts";
import EditableDocumentName, {
  EditableDocumentNameHandle,
} from "../../components/EditableDocumentName/EditableDocumentName.tsx";
import EditableDocumentNameButton from "../../components/EditableDocumentName/EditableDocumentNameButton.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import DocumentInformation from "../search/DocumentViewer/DocumentInformation/DocumentInformation.tsx";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector.tsx";
import CodeExplorer from "./CodeExplorer/CodeExplorer.tsx";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator.tsx";
import MemoExplorer from "./MemoExplorer/MemoExplorer.tsx";
import TextAnnotator from "./TextAnnotator/TextAnnotator.tsx";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;
  const { user } = useAuth();

  // local state
  const editableDocumentNameHandle = useRef<EditableDocumentNameHandle>(null);

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
  const metadata = SdocHooks.useGetMetadata(sourceDocumentId);
  const annotationDocument = SdocHooks.useGetOrCreateAdocOfUser(sourceDocumentId, user?.id);

  // tabs
  const [tab, setTab] = useState("code");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
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
          md={2}
          className="h100 myFlexContainer"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderRight: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
              <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
                <Tab label="Code Explorer" value="code" />
                <Tab label="Annotation Explorer" value="Annotation" />
              </Tabs>
            </Box>
            <Box className="myFlexFillAllContainer">
              <TabPanel value="code" style={{ padding: 0 }} className="h100">
                <CodeExplorer showButtons={true} />
              </TabPanel>
              <TabPanel value="Annotation" style={{ padding: 0 }} className="h100">
                <MemoExplorer sdocId={sourceDocumentId} />
              </TabPanel>
            </Box>
          </TabContext>
        </Grid>
        <Grid
          item
          md={8}
          className="h100 myFlexContainer"
          sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
        >
          <Toolbar
            disableGutters
            variant="dense"
            sx={{
              zIndex: (theme) => theme.zIndex.appBar + 1,
              bgcolor: (theme) => theme.palette.background.paper,
              borderBottom: "1px solid #e8eaed",
              boxShadow: 4,
            }}
          >
            <AnnotationDocumentSelector sdocId={sourceDocumentId} />
          </Toolbar>
          {/* <AnnotationDocumentSelector className="myFlexFitContentContainer" sdocId={sourceDocumentId} /> */}
          <Container className="myFlexFillAllContainer" sx={{ py: 2, overflowY: "auto" }}>
            <Card raised className="h100">
              <CardContent className="h100">
                {sdocId ? (
                  <>
                    {sourceDocument.isSuccess && annotationDocument.isSuccess && metadata.isSuccess ? (
                      <>
                        <Stack spacing={2} className="h100">
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

                          <Box></Box>
                          {sourceDocument.data.doctype === DocType.IMAGE ? (
                            <ImageAnnotator sdoc={sourceDocument.data} adoc={annotationDocument.data} />
                          ) : sourceDocument.data.doctype === DocType.TEXT ? (
                            <TextAnnotator sdoc={sourceDocument.data} adoc={annotationDocument.data} />
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
          md={2}
          className="h100 myFlexContainer"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderLeft: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          <DocumentInformation sdocId={sourceDocumentId} />
        </Grid>
      </Grid>
    </>
  );
}

export default Annotation;
