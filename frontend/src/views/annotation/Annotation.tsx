import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Portal, Tab, Tabs, Typography } from "@mui/material";
import React, { useContext, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { SourceDocumentDataRead } from "../../api/openapi/models/SourceDocumentDataRead.ts";
import CodeExplorer from "../../components/Code/CodeExplorer/CodeExplorer.tsx";
import EditableTypography from "../../components/EditableTypography.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import DocumentInformation from "../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import OneSidebarLayout from "../../layouts/OneSidebarLayout.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import TwoSidebarsLayout from "../../layouts/TwoSidebarsLayout.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import BBoxAnnotationExplorer from "./AnnotationExploer/BBoxAnnotationExplorer.tsx";
import SentenceAnnotationExplorer from "./AnnotationExploer/SentenceAnnotationExplorer.tsx";
import SpanAnnotationExplorer from "./AnnotationExploer/SpanAnnotationExplorer.tsx";
import AnnotationMode from "./AnnotationMode.ts";
import AudioVideoViewer from "./DocumentViewer/AudioVideoViewer.tsx";
import ImageViewer from "./DocumentViewer/ImageViewer.tsx";
import TextViewer from "./DocumentViewer/TextViewer.tsx";
import ImageAnnotator from "./ImageAnnotator/ImageAnnotator.tsx";
import SentenceAnnotator from "./SentenceAnnotator/Annotator/SentenceAnnotator.tsx";
import SentenceAnnotationComparison from "./SentenceAnnotator/Comparator/SentenceAnnotationComparison.tsx";
import TextAnnotator from "./TextAnnotator/TextAnnotator.tsx";
import AnnotationToolbar from "./Toolbar/AnnotationToolbar.tsx";

const annotatorComponent = (
  sdocData: SourceDocumentDataRead,
  boxRef: React.RefObject<HTMLDivElement>,
): Record<DocType, Record<AnnotationMode, React.ReactElement>> => ({
  [DocType.TEXT]: {
    [AnnotationMode.Annotation]: <TextAnnotator sdocData={sdocData} />,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotator
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
    [AnnotationMode.Reader]: <TextViewer sdocData={sdocData} />,
  },
  [DocType.IMAGE]: {
    [AnnotationMode.Annotation]: <ImageAnnotator sdocData={sdocData} />,
    [AnnotationMode.SentenceAnnotation]: <ImageAnnotator sdocData={sdocData} />,
    [AnnotationMode.Reader]: <ImageViewer sdocData={sdocData} />,
  },
  [DocType.AUDIO]: {
    [AnnotationMode.Annotation]: <TextAnnotator sdocData={sdocData} />,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotator
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
    [AnnotationMode.Reader]: (
      <AudioVideoViewer sdocData={sdocData} showEntities={true} width={"100%"} height={"64px"} />
    ),
  },
  [DocType.VIDEO]: {
    [AnnotationMode.Annotation]: <TextAnnotator sdocData={sdocData} />,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotator
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
    [AnnotationMode.Reader]: <AudioVideoViewer sdocData={sdocData} showEntities={true} width={800} height={600} />,
  },
});

const comparatorComponent = (
  sdocData: SourceDocumentDataRead,
  boxRef: React.RefObject<HTMLDivElement>,
): Record<DocType, Record<AnnotationMode, React.ReactElement>> => ({
  [DocType.TEXT]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotationComparison
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.IMAGE]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: <div>Not supported</div>,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.AUDIO]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: <div>Not supported</div>,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.VIDEO]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: <div>Not supported</div>,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
});

const explorerComponent = (sdocId: number): Record<DocType, Record<AnnotationMode, React.ReactElement>> => ({
  [DocType.TEXT]: {
    [AnnotationMode.Annotation]: <SpanAnnotationExplorer sdocId={sdocId} />,
    [AnnotationMode.SentenceAnnotation]: <SentenceAnnotationExplorer sdocId={sdocId} />,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.IMAGE]: {
    [AnnotationMode.Annotation]: <BBoxAnnotationExplorer sdocId={sdocId} />,
    [AnnotationMode.SentenceAnnotation]: <BBoxAnnotationExplorer sdocId={sdocId} />,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.AUDIO]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: <div>Not supported</div>,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.VIDEO]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: <div>Not supported</div>,
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
});

function Annotation() {
  // global client state (URL)
  const params = useParams() as { projectId: string; sdocId: string };
  const sdocId = parseInt(params.sdocId);

  // global client state (redux)
  // components are selected based on these states
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);

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

  // explorer
  const [tab, setTab] = useState("code");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };
  const explorer = (
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
              {explorerComponent(sdoc.data.id)[sdoc.data.doctype][annotationMode]}
            </TabPanel>
          )}
        </Box>
      </TabContext>
    </Box>
  );

  // for virtualization in annotator components
  const boxRef = useRef<HTMLDivElement | null>(null);

  // annotator: the main content
  const annotator = (
    <Box className="myFlexFillAllContainer" ref={boxRef}>
      <Container sx={{ py: 2 }} maxWidth="xl">
        <Card raised>
          <CardContent>
            {sdocId ? (
              <>
                {sdoc.isSuccess && sdocData.isSuccess ? (
                  <>
                    <EditableTypography
                      value={sdoc.data.name || sdoc.data.filename}
                      onChange={handleUpdateName}
                      variant="h4"
                      whiteColor={false}
                      stackProps={{
                        width: "100%",
                        flexGrow: 1,
                        mb: 2,
                      }}
                    />
                    {isCompareMode
                      ? comparatorComponent(sdocData.data, boxRef)[sdoc.data.doctype][annotationMode]
                      : annotatorComponent(sdocData.data, boxRef)[sdoc.data.doctype][annotationMode]}
                  </>
                ) : sdoc.isError ? (
                  <div>Error: {sdoc.error.message}</div>
                ) : (
                  <div>Loading...</div>
                )}
              </>
            ) : (
              <div>Please double-click a document in Search to view it here :)</div>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );

  // layout: use one sidebar layout in compare mode
  let layout: JSX.Element = <></>;
  if (isCompareMode) {
    layout = (
      <OneSidebarLayout
        leftSidebar={explorer}
        content={
          <>
            <AnnotationToolbar sdoc={sdoc.data} />
            {annotator}
          </>
        }
      />
    );
  } else {
    layout = (
      <TwoSidebarsLayout
        leftSidebar={explorer}
        content={
          <>
            <AnnotationToolbar sdoc={sdoc.data} />
            {annotator}
          </>
        }
        rightSidebar={<DocumentInformation sdocId={sdocId} />}
      />
    );
  }

  // rendering
  const appBarContainerRef = useContext(AppBarContext);
  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          {sdoc.isSuccess ? `Annotator: ${sdoc.data.filename}` : "Annotator"}
        </Typography>
      </Portal>
      {layout}
    </>
  );
}

export default Annotation;
