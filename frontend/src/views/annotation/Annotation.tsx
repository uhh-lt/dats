import BorderColorIcon from "@mui/icons-material/BorderColor";
import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import { TabContext, TabPanel } from "@mui/lab";
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Portal,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
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
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import AudioVideoViewer from "../search/DocumentViewer/AudioVideoViewer.tsx";
import DocumentInformation from "../search/DocumentViewer/DocumentInformation/DocumentInformation.tsx";
import ImageViewer from "../search/DocumentViewer/ImageViewer.tsx";
import TextViewer from "../search/DocumentViewer/TextViewer.tsx";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector.tsx";
import CodeExplorer from "./CodeExplorer/CodeExplorer.tsx";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator.tsx";
import MemoExplorer from "./MemoExplorer/MemoExplorer.tsx";
import TextAnnotator from "./TextAnnotator/TextAnnotator.tsx";
import { AnnoActions } from "./annoSlice.ts";

function Annotation() {
  // global client state (URL)
  const { sdocId } = useParams();
  const sourceDocumentId = sdocId ? parseInt(sdocId) : undefined;
  const { user } = useAuth();

  // local state
  const editableDocumentNameHandle = useRef<EditableDocumentNameHandle>(null);

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (redux)
  const isAnnotationMode = useAppSelector((state) => state.annotations.isAnnotationMode);
  const dispatch = useAppDispatch();
  console.log(isAnnotationMode);

  // global server state (react query)
  const sourceDocument = SdocHooks.useGetDocument(sourceDocumentId);
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
                <CodeExplorer className="h100" />
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
              justifyContent: "center",
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              value={isAnnotationMode}
              exclusive
              onChange={() => dispatch(AnnoActions.onToggleAnnotationMode())}
              aria-label="text alignment"
              size="small"
              color="primary"
            >
              <Tooltip title="Annotation Mode" placement="bottom">
                <ToggleButton value={true} sx={{ fontSize: 12 }}>
                  <BorderColorIcon />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Reader Mode" placement="bottom">
                <ToggleButton value={false} sx={{ fontSize: 12 }}>
                  <ChromeReaderModeIcon />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <AnnotationDocumentSelector sdocId={sourceDocumentId} />
          </Toolbar>
          <Box className="myFlexFillAllContainer">
            <Container sx={{ py: 2 }}>
              <Card raised>
                <CardContent>
                  {sdocId ? (
                    <>
                      {sourceDocument.isSuccess && annotationDocument.isSuccess ? (
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
                          {sourceDocument.data.doctype === DocType.IMAGE ? (
                            isAnnotationMode ? (
                              <ImageAnnotator sdoc={sourceDocument.data} adoc={annotationDocument.data} />
                            ) : (
                              <ImageViewer
                                sdoc={sourceDocument.data}
                                adoc={annotationDocument.data}
                                showEntities={true}
                              />
                            )
                          ) : sourceDocument.data.doctype === DocType.TEXT ? (
                            isAnnotationMode ? (
                              <TextAnnotator sdoc={sourceDocument.data} adoc={annotationDocument.data} />
                            ) : (
                              <TextViewer
                                sdoc={sourceDocument.data}
                                adoc={annotationDocument.data}
                                showEntities={true}
                              />
                            )
                          ) : sourceDocument.data.doctype === DocType.AUDIO ? (
                            isAnnotationMode ? (
                              <div>Annotation is not (yet) supported for Audio Documents.</div>
                            ) : (
                              <AudioVideoViewer
                                sdoc={sourceDocument.data}
                                adoc={annotationDocument.data}
                                showEntities={true}
                                height={200}
                              />
                            )
                          ) : sourceDocument.data.doctype === DocType.VIDEO ? (
                            isAnnotationMode ? (
                              <div>Annotation is not (yet) supported for Video Documents.</div>
                            ) : (
                              <AudioVideoViewer
                                sdoc={sourceDocument.data}
                                adoc={annotationDocument.data}
                                showEntities={true}
                                width={800}
                                height={600}
                              />
                            )
                          ) : (
                            <div>ERROR! This DocType is not (yet) supported!</div>
                          )}
                        </Stack>
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
          </Box>
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
