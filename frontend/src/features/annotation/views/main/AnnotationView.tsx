import { SdocHooks } from "@api/hooks/SdocHooks";
import { EditableTypography } from "@components/EditableTypography";
import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { CodeExplorer } from "@core/code";
import { DocumentInfoPanel } from "@core/source-document";
import { useURLConnector } from "@hooks/useURLConnector";
import { DocType } from "@models/DocType";
import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { TabContext, TabPanel } from "@mui/lab";
import { Box, Card, CardContent, Container, Tab, Tabs } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ReactElement, SyntheticEvent, useCallback, useState } from "react";
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
  const { data: sdoc } = useSuspenseQuery(SdocHooks.getDocumentQueryOptions(sdocId));
  const { data: sdocData } = useSuspenseQuery(SdocHooks.getDocumentDataQueryOptions(sdocId));

  // rename document
  const updateNameMutation = SdocHooks.useUpdateName();
  const handleUpdateName = (newName: string) => {
    if (newName === sdoc.name) {
      return;
    }
    updateNameMutation.mutate({
      sdocId: sdoc.id,
      requestBody: {
        name: newName,
      },
    });
  };

  // explorer
  const [explorerTab, setExplorerTab] = useURLConnector(AnnotationRouteAPI, "explorerTab");
  const handleTabChange = useCallback(
    (_event: SyntheticEvent, newValue: "code" | "annotation"): void => {
      setExplorerTab(newValue);
    },
    [setExplorerTab],
  );
  const explorer = (
    <Box className="h100 myFlexContainer">
      <TabContext value={explorerTab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={explorerTab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Code Explorer" value="code" />
            <Tab label="Annotation Explorer" value="annotation" />
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
          <TabPanel value="annotation" style={{ padding: 0 }} className="h100">
            {explorerComponent(sdoc.id)[sdoc.doctype][annotationMode]}
          </TabPanel>
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
          <AnnotationToolbar sdoc={sdoc} />
          <Box className="myFlexFillAllContainer" ref={setBoxNode}>
            <Container sx={{ py: 2 }} maxWidth="xl">
              <Card raised>
                <CardContent>
                  {boxNode && (
                    <>
                      <EditableTypography
                        value={sdoc.name}
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
                        ? comparatorComponent(sdocData, boxNode)[sdoc.doctype][annotationMode]
                        : annotatorComponent(sdocData, boxNode)[sdoc.doctype][annotationMode]}
                    </>
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
