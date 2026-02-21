import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Tab, Tabs } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ReactElement, useEffect, useRef, useState } from "react";
import { SdocHooks } from "../../api/SdocHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { SourceDocumentDataRead } from "../../api/openapi/models/SourceDocumentDataRead.ts";
import { SidebarContentSidebarLayout } from "../../layouts/ContentLayouts/SidebarContentSidebarLayout.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { BBoxAnnotationExplorer } from "./AnnotationExplorer/BBoxAnnotationExplorer.tsx";
import { SentenceAnnotationExplorer } from "./AnnotationExplorer/SentenceAnnotationExplorer.tsx";
import { SpanAnnotationExplorer } from "./AnnotationExplorer/SpanAnnotationExplorer.tsx";
import { AudioVideoViewer } from "./DocumentViewer/AudioVideoViewer.tsx";
import { ImageViewer } from "./DocumentViewer/ImageViewer.tsx";
import { TextViewer } from "./DocumentViewer/TextViewer.tsx";
import { AnnotationToolbar } from "./Toolbar/AnnotationToolbar.tsx";
import { ImageAnnotator } from "./components/ImageAnnotator.tsx";
import { SentenceAnnotator } from "./components/SentenceAnnotator/Annotator/SentenceAnnotator.tsx";
import { SentenceAnnotationComparison } from "./components/SentenceAnnotator/Comparator/SentenceAnnotationComparison.tsx";
import { TextAnnotator } from "./components/TextAnnotator.tsx";
import { AnnotationMode } from "./types/AnnotationMode.ts";

const routeApi = getRouteApi("/_auth/project/$projectId/annotation/$sdocId");

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
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotator
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
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
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotationComparison
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElementRef={boxRef}
      />
    ),
    [AnnotationMode.Reader]: <div>Not supported</div>,
  },
  [DocType.VIDEO]: {
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
});

const explorerComponent = (sdocId: number): Record<DocType, Record<AnnotationMode, ReactElement>> => ({
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

export function AnnotationView() {
  // global client state (URL)
  const sdocId = routeApi.useParams({ select: (params) => params.sdocId });

  // global client state (redux)
  // components are selected based on these states
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);

  // global server state (react query)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const sdocData = SdocHooks.useGetDocumentData(sdocId);

  // rename document
  const updateNameMutation = SdocHooks.useUpdateName();
  const handleUpdateName = (newName: string) => {
    if (sdoc.isSuccess) {
      if (newName === sdoc.data.name) {
        return;
      }
      updateNameMutation.mutate({
        sdocId: sdoc.data.id,
        requestBody: {
          name: newName,
        },
      });
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
  const [isBoxReady, setIsBoxReady] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (boxRef.current) {
      setIsBoxReady(true);
    }
  }, [boxRef]);

  // rendering
  return (
    <SidebarContentSidebarLayout
      leftSidebar={explorer}
      content={
        <Box className="h100 myFlexContainer">
          <AnnotationToolbar sdoc={sdoc.data} />
          <Box className="myFlexFillAllContainer" ref={boxRef}>
            <Container sx={{ py: 2 }} maxWidth="xl">
              <Card raised>
                <CardContent>
                  {sdocId ? (
                    <>
                      {sdoc.isSuccess && sdocData.isSuccess && isBoxReady ? (
                        <>
                          <EditableTypography
                            value={sdoc.data.name}
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
        </Box>
      }
      rightSidebar={<DocumentInformation sdocId={sdocId} filterName="root" />}
    />
  );
}
