import BorderColorIcon from "@mui/icons-material/BorderColor";
import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import { TabContext, TabPanel } from "@mui/lab";
import {
  Box,
  Card,
  CardContent,
  Container,
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
import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { useAuth } from "../../auth/useAuth.ts";
import CodeExplorer from "../../components/Code/CodeExplorer/CodeExplorer.tsx";
import EditableTypography from "../../components/EditableTypography.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import DocumentInformation from "../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import TwoSidebarsLayout from "../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AnnotationDocumentSelector } from "./AnnotationDocumentSelector.tsx";
import BBoxAnnotationExplorer from "./AnnotationExploer/BBoxAnnotationExplorer.tsx";
import SpanAnnotationExplorer from "./AnnotationExploer/SpanAnnotationExplorer.tsx";
import AudioVideoViewer from "./DocumentViewer/AudioVideoViewer.tsx";
import ImageViewer from "./DocumentViewer/ImageViewer.tsx";
import TextViewer from "./DocumentViewer/TextViewer.tsx";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator.tsx";
import TextAnnotator from "./TextAnnotator/TextAnnotator.tsx";
import { AnnoActions } from "./annoSlice.ts";

function Annotation() {
  // global client state (URL)
  const params = useParams() as { projectId: string; sdocId: string };
  const sdocId = parseInt(params.sdocId);
  const { user } = useAuth();

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (redux)
  const isAnnotationMode = useAppSelector((state) => state.annotations.isAnnotationMode);
  const dispatch = useAppDispatch();

  // global server state (react query)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const annotationDocument = SdocHooks.useGetOrCreateAdocOfUser(sdocId, user?.id);

  // rename document
  const openSnackbar = useOpenSnackbar();
  const updateNameMutation = SdocHooks.useUpdateName();
  const handleUpdateName = (newName: string) => {
    if (sdoc.isSuccess) {
      if (newName === sdoc.data.name) {
        return;
      }
      updateNameMutation.mutate(
        {
          sdocId: sdoc.data.id,
          requestBody: {
            name: newName,
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
              text: `Updated document name to ${data.name}`,
              severity: "success",
            });
          },
        },
      );
    }
  };

  // tabs
  const [tab, setTab] = useState("code");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {sdoc.isSuccess ? `Annotator: ${sdoc.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      <TwoSidebarsLayout
        leftSidebar={
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
              {annotationDocument.isSuccess && sdoc.isSuccess && (
                <TabPanel value="Annotation" style={{ padding: 0 }} className="h100">
                  {sdoc.data.doctype === DocType.TEXT ? (
                    <SpanAnnotationExplorer />
                  ) : sdoc.data.doctype === DocType.IMAGE ? (
                    <BBoxAnnotationExplorer />
                  ) : (
                    <>Not supported (yet)!</>
                  )}
                </TabPanel>
              )}
            </Box>
          </TabContext>
        }
        content={
          <>
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
              {annotationDocument.isSuccess && <AnnotationDocumentSelector sdocId={sdocId} />}
            </Toolbar>
            <Box className="myFlexFillAllContainer">
              <Container sx={{ py: 2 }}>
                <Card raised>
                  <CardContent>
                    {sdocId ? (
                      <>
                        {sdoc.isSuccess && annotationDocument.isSuccess ? (
                          <Stack spacing={2}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <EditableTypography
                                value={sdoc.data.name || sdoc.data.filename}
                                onChange={handleUpdateName}
                                variant="h4"
                                whiteColor={false}
                                stackProps={{
                                  width: "50%",
                                  flexGrow: 1,
                                }}
                              />
                            </div>
                            {sdoc.data.doctype === DocType.IMAGE ? (
                              isAnnotationMode ? (
                                <ImageAnnotator sdoc={sdoc.data} adoc={annotationDocument.data} />
                              ) : (
                                <ImageViewer sdoc={sdoc.data} />
                              )
                            ) : sdoc.data.doctype === DocType.TEXT ? (
                              isAnnotationMode ? (
                                <TextAnnotator sdoc={sdoc.data} adoc={annotationDocument.data} />
                              ) : (
                                <TextViewer sdoc={sdoc.data} />
                              )
                            ) : sdoc.data.doctype === DocType.AUDIO ? (
                              isAnnotationMode ? (
                                <div>Annotation is not (yet) supported for Audio Documents.</div>
                              ) : (
                                <AudioVideoViewer
                                  sdoc={sdoc.data}
                                  adoc={annotationDocument.data}
                                  showEntities={true}
                                  height={200}
                                />
                              )
                            ) : sdoc.data.doctype === DocType.VIDEO ? (
                              isAnnotationMode ? (
                                <div>Annotation is not (yet) supported for Video Documents.</div>
                              ) : (
                                <AudioVideoViewer
                                  sdoc={sdoc.data}
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
                        ) : sdoc.isError ? (
                          <div>Error: {sdoc.error.message}</div>
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
          </>
        }
        rightSidebar={<DocumentInformation sdocId={sdocId} />}
      />
    </>
  );
}

export default Annotation;
