import { SdocHooks } from "@api/hooks/SdocHooks";
import { DocType } from "@api/models/DocType";
import { SourceDocumentDataRead } from "@api/models/SourceDocumentDataRead";
import { EditableTypography } from "@components/EditableTypography";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { CodeExplorer } from "@core/code";
import { DocumentInfoPanel } from "@core/source-document";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Tab, Tabs } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ReactElement, useCallback, useState } from "react";
import { AudioVideoViewer } from "../../_components/AudioVideoViewer";
import { ImageAnnotator } from "../../_components/ImageAnnotator";
import { ImageViewer } from "../../_components/ImageViewer";
import { TextAnnotator } from "../../_components/TextAnnotator";
import { BBoxAnnotationExplorer, SentenceAnnotationExplorer, SpanAnnotationExplorer } from "../../_components/explorer";
import { SentenceAnnotationComparison, SentenceAnnotator } from "../../_components/sentence-annotator";
import { TextViewer } from "../../_components/text-viewer";
import { AnnotationToolbar } from "../../_components/toolbar";
import { AnnotationRouteAPI } from "../../_hooks/annotationRouteAPI";
import { AnnotationMode } from "../../_types/AnnotationMode";
import { AnnoActions } from "../../store/annoSlice";

const annotatorComponent = (
  sdocData: SourceDocumentDataRead,
  boxRef: HTMLDivElement,
): Record<DocType, Record<AnnotationMode, React.ReactElement>> => ({
  [DocType.TEXT]: {
    [AnnotationMode.Annotation]: <TextAnnotator sdocData={sdocData} />,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotator
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElement={boxRef}
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
        virtualizerScrollElement={boxRef}
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
        virtualizerScrollElement={boxRef}
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
        virtualizerScrollElement={boxRef}
      />
    ),
    [AnnotationMode.Reader]: <AudioVideoViewer sdocData={sdocData} showEntities={true} width={800} height={600} />,
  },
});

const comparatorComponent = (
  sdocData: SourceDocumentDataRead,
  boxRef: HTMLDivElement,
): Record<DocType, Record<AnnotationMode, React.ReactElement>> => ({
  [DocType.TEXT]: {
    [AnnotationMode.Annotation]: <div>Not supported</div>,
    [AnnotationMode.SentenceAnnotation]: (
      <SentenceAnnotationComparison
        sdocData={sdocData}
        style={{ marginLeft: "-16px", marginBottom: "-24px", marginRight: "-16px" }}
        virtualizerScrollElement={boxRef}
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
        virtualizerScrollElement={boxRef}
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
        virtualizerScrollElement={boxRef}
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
  const sdocId = AnnotationRouteAPI.useParams({ select: (params) => params.sdocId });
  const { compareWithUserId } = AnnotationRouteAPI.useSearch();
  const isCompareMode = compareWithUserId !== undefined;

  // global client state (redux)
  const dispatch = useAppDispatch();
  const annotationMode = useAppSelector((state) => state.annotations.annotationMode);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const expandedCodeIds = useAppSelector((state) => state.annotations.expandedCodeIds);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // code explorer handlers
  const handleSelectedCodeIdChange = useCallback(
    (codeId: number | undefined) => dispatch(AnnoActions.setSelectedCodeId(codeId)),
    [dispatch],
  );
  const handleExpandedCodeIdsChange = useCallback(
    (ids: string[]) => dispatch(AnnoActions.setExpandedCodeIds(ids)),
    [dispatch],
  );
  const handleHoverCodeIdChange = useCallback(
    (codeId: number | undefined) => dispatch(AnnoActions.setHoveredCodeId(codeId)),
    [dispatch],
  );
  const handleToggleCodeVisibility = useCallback(
    (codeIds: number[]) => dispatch(AnnoActions.toggleCodeVisibility(codeIds)),
    [dispatch],
  );

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
            <CodeExplorer
              className="h100"
              selectedCodeId={selectedCodeId}
              onSelectedCodeIdChange={handleSelectedCodeIdChange}
              expandedCodeIds={expandedCodeIds}
              onExpandedCodeIdsChange={handleExpandedCodeIdsChange}
              hiddenCodeIds={hiddenCodeIds}
              onToggleCodeVisibility={handleToggleCodeVisibility}
              onHoverCodeIdChange={handleHoverCodeIdChange}
            />
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
  const [boxNode, setBoxNode] = useState<HTMLDivElement | null>(null);

  // rendering
  return (
    <SidebarContentSidebarLayout
      leftSidebar={explorer}
      content={
        <Box className="h100 myFlexContainer">
          <AnnotationToolbar sdoc={sdoc.data} />
          <Box className="myFlexFillAllContainer" ref={setBoxNode}>
            <Container sx={{ py: 2 }} maxWidth="xl">
              <Card raised>
                <CardContent>
                  {sdocId ? (
                    <>
                      {sdoc.isSuccess && sdocData.isSuccess && boxNode ? (
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
                            ? comparatorComponent(sdocData.data, boxNode)[sdoc.data.doctype][annotationMode]
                            : annotatorComponent(sdocData.data, boxNode)[sdoc.data.doctype][annotationMode]}
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
      rightSidebar={<DocumentInfoPanel sdocId={sdocId} onAddMetadataFilter={undefined} />}
    />
  );
}
