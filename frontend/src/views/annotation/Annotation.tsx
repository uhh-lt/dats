import ChromeReaderModeIcon from "@mui/icons-material/ChromeReaderMode";
import DoNotDisturbIcon from "@mui/icons-material/DoNotDisturb";
import FormatOverlineIcon from "@mui/icons-material/FormatOverline";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import ShortTextIcon from "@mui/icons-material/ShortText";
import SubjectIcon from "@mui/icons-material/Subject";
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
import CodeExplorer from "../../components/Code/CodeExplorer/CodeExplorer.tsx";
import EditableTypography from "../../components/EditableTypography.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import DocumentInformation from "../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import TwoSidebarsLayout from "../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import BBoxAnnotationExplorer from "./AnnotationExploer/BBoxAnnotationExplorer.tsx";
import SpanAnnotationExplorer from "./AnnotationExploer/SpanAnnotationExplorer.tsx";
import AnnotationMode from "./AnnotationMode.ts";
import { AnnotatorSelector } from "./AnnotatorSelector.tsx";
import AudioVideoViewer from "./DocumentViewer/AudioVideoViewer.tsx";
import ImageViewer from "./DocumentViewer/ImageViewer.tsx";
import TextViewer from "./DocumentViewer/TextViewer.tsx";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator.tsx";
import SentenceAnnotator from "./SentenceAnnotator/SentenceAnnotator.tsx";
import TextAnnotator from "./TextAnnotator/TextAnnotator.tsx";
import { AnnoActions, TagStyle } from "./annoSlice.ts";

function Annotation() {
  // global client state (URL)
  const params = useParams() as { projectId: string; sdocId: string };
  const sdocId = parseInt(params.sdocId);

  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (redux)
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  // global server state (react query)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const sdocData = SdocHooks.useGetDocumentData(sdocId);

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
        <Typography variant="h6" component="div">
          {sdoc.isSuccess ? `Annotator: ${sdoc.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      <TwoSidebarsLayout
        leftSidebar={
          <Box className="h100 myFlexContainer">
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
                {sdoc.isSuccess && (
                  <TabPanel value="Annotation" style={{ padding: 0 }} className="h100">
                    {sdoc.data.doctype === DocType.TEXT ? (
                      <SpanAnnotationExplorer sdocId={sdoc.data.id} />
                    ) : sdoc.data.doctype === DocType.IMAGE ? (
                      <BBoxAnnotationExplorer sdocId={sdoc.data.id} />
                    ) : (
                      <>Not supported (yet)!</>
                    )}
                  </TabPanel>
                )}
              </Box>
            </TabContext>
          </Box>
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
                value={annotationMode}
                exclusive
                onChange={(_, value) => dispatch(AnnoActions.onChangeAnnotationMode(value))}
                size="small"
                color="primary"
              >
                {sdoc.data?.doctype === DocType.TEXT && (
                  <Tooltip title="Sentence Annotation" placement="bottom">
                    <ToggleButton value={AnnotationMode.SentenceAnnotation} sx={{ fontSize: 12 }}>
                      <SubjectIcon />
                    </ToggleButton>
                  </Tooltip>
                )}
                <Tooltip title="Span Annotation" placement="bottom">
                  <ToggleButton value={AnnotationMode.Annotation} sx={{ fontSize: 12 }}>
                    <ShortTextIcon />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Reading" placement="bottom">
                  <ToggleButton value={AnnotationMode.Reader} sx={{ fontSize: 12 }}>
                    <ChromeReaderModeIcon />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <AnnotatorSelector sdocId={sdocId} />
              {sdoc.data?.doctype === DocType.TEXT && (
                <ToggleButtonGroup
                  value={tagStyle}
                  exclusive
                  onChange={(_, value) => dispatch(AnnoActions.onSetAnnotatorTagStyle(value))}
                  size="small"
                  color="primary"
                >
                  <Tooltip title="None" placement="bottom">
                    <ToggleButton value={TagStyle.None} sx={{ fontSize: 12 }}>
                      <DoNotDisturbIcon />
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Inline" placement="bottom">
                    <ToggleButton value={TagStyle.Inline} sx={{ fontSize: 12 }}>
                      <FormatStrikethroughIcon />
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Above" placement="bottom">
                    <ToggleButton value={TagStyle.Above} sx={{ fontSize: 12 }}>
                      <FormatOverlineIcon />
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>
              )}
            </Toolbar>
            <Box className="myFlexFillAllContainer">
              <Container sx={{ py: 2 }}>
                <Card raised>
                  <CardContent>
                    {sdocId ? (
                      <>
                        {sdoc.isSuccess && sdocData.isSuccess ? (
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
                              annotationMode === AnnotationMode.Annotation ? (
                                <ImageAnnotator sdocData={sdocData.data} />
                              ) : (
                                <ImageViewer sdocData={sdocData.data} />
                              )
                            ) : sdoc.data.doctype === DocType.TEXT ? (
                              annotationMode === AnnotationMode.Annotation ? (
                                <TextAnnotator sdocData={sdocData.data} />
                              ) : annotationMode === AnnotationMode.SentenceAnnotation ? (
                                <SentenceAnnotator sdocData={sdocData.data} />
                              ) : (
                                <TextViewer sdocData={sdocData.data} />
                              )
                            ) : sdoc.data.doctype === DocType.AUDIO ? (
                              annotationMode === AnnotationMode.Annotation ? (
                                <div>Annotation is not (yet) supported for Audio Documents.</div>
                              ) : (
                                <AudioVideoViewer
                                  sdocData={sdocData.data}
                                  showEntities={true}
                                  width={"100%"}
                                  height={"64px"}
                                />
                              )
                            ) : sdoc.data.doctype === DocType.VIDEO ? (
                              annotationMode === AnnotationMode.Annotation ? (
                                <div>Annotation is not (yet) supported for Video Documents.</div>
                              ) : (
                                <AudioVideoViewer
                                  sdocData={sdocData.data}
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
