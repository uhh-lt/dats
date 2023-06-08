import { Box, Card, CardContent, CardProps, Stack } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../../api/SdocHooks";
import { DocType, DocumentTagRead } from "../../../api/openapi";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import LexicalSearchResultCard from "../SearchResults/Cards/LexicalSearchResultCard";
import { SearchActions } from "../searchSlice";
import { DocumentAdocSelector } from "./DocumentAdocSelector";
import DocumentLinkToOriginal from "./DocumentLinkToOriginal";
import DocumentMetadata from "./DocumentMetadata/DocumentMetadata";
import DocumentTagChip from "./DocumentTagChip";
import ImageViewer from "./ImageViewer";
import TextViewer from "./TextViewer";
import VideoViewer from "./VideoViewer";
import AudioViewer from "./AudioViewer";
import { useDeletableDocumentTags } from "./useDeletableDocumentTags";
import { useSelectableAnnotationDocuments } from "./useSelectableAnnotationDocuments";

interface DocumentViewerProps {
  sdocId: number | undefined;
  handleTagClick: (tagId: number) => void;
  showEntities: boolean;
  isIdleContent?: React.ReactNode;
}

function DocumentViewer({
  sdocId,
  handleTagClick,
  showEntities,
  isIdleContent,
  ...props
}: DocumentViewerProps & Omit<CardProps, "raised">) {
  const navigate = useNavigate();

  // queries
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);
  const { documentTags, handleDeleteDocumentTag } = useDeletableDocumentTags(sdocId);
  const { annotationDocuments, selectedAdoc, handleSelectAnnotationDocument } =
    useSelectableAnnotationDocuments(sdocId);
  const metadata = SdocHooks.useGetMetadata(sdocId);

  // the queries are disabled if sdocId is undefined => show the idle content
  const dispatch = useAppDispatch();
  if (sdocId === undefined || sdocId === null) {
    dispatch(SearchActions.resetFilterInfos());
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Card raised {...props}>
      <CardContent>
        <Stack spacing={2}>
          {sdoc.isLoading && <h1 style={{ margin: 0 }}>Loading...</h1>}
          {sdoc.isError && <h1 style={{ margin: 0 }}>{sdoc.error.message}</h1>}
          {sdoc.isSuccess && (
            <DocumentLinkToOriginal sdocId={sdocId} title={sdoc.data.filename} variant={"h3"} style={{ margin: 0 }} />
          )}
          <div>
            {documentTags.isLoading && <span>Loading tags...</span>}
            {documentTags.isError && <span>{documentTags.error.message}</span>}
            {documentTags.isSuccess &&
              documentTags.data.map((tag: DocumentTagRead) => (
                <DocumentTagChip
                  key={tag.id}
                  tagId={tag.id}
                  handleClick={(tag) => handleTagClick(tag.id)}
                  handleDelete={handleDeleteDocumentTag}
                />
              ))}
          </div>
          <Box>
            <DocumentMetadata sdocId={sdocId} metadata={metadata} />
            {annotationDocuments.isLoading && <span>Loading annotation documents...</span>}
            {annotationDocuments.isError && <span>{annotationDocuments.error.message}</span>}
            {annotationDocuments.isSuccess && selectedAdoc && (
              <DocumentAdocSelector
                annotationDocuments={annotationDocuments.data}
                handleSelectAnnotationDocument={handleSelectAnnotationDocument}
                selectedAdoc={selectedAdoc}
              />
            )}
          </Box>
          {sdoc.isSuccess && selectedAdoc && (
            <>
              {sdoc.data.doctype === DocType.TEXT && (
                <>
                  <TextViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
                </>
              )}
              {sdoc.data.doctype === DocType.IMAGE && metadata.isSuccess && (
                <>
                  <ImageViewer
                    sdoc={sdoc.data}
                    adoc={selectedAdoc}
                    showEntities={showEntities}
                    width={parseInt(metadata.data.get("width")!.value)}
                    height={parseInt(metadata.data.get("height")!.value)}
                  />
                </>
              )}
              {sdoc.data.doctype === DocType.AUDIO && (
                <>
                  <AudioViewer
                    sdoc={sdoc.data}
                    adoc={selectedAdoc}
                    showEntities={showEntities}
                    height={200}
                  />
                </>
              )}
              {sdoc.data.doctype === DocType.VIDEO && metadata.isSuccess && (
                <>
                  <VideoViewer
                    sdoc={sdoc.data}
                    adoc={selectedAdoc}
                    showEntities={showEntities}
                  />
                </>
              )}
            </>
          )}

          {linkedSdocIds.isSuccess && linkedSdocIds.data.length > 0 && (
            <>
              <h3>Linked documents:</h3>
              <Box pb={1} style={{ overflowX: "auto", whiteSpace: "nowrap" }}>
                {linkedSdocIds.data.map((sdocId) => (
                  <LexicalSearchResultCard
                    key={sdocId}
                    sdocId={sdocId}
                    handleClick={() => navigate(`../search/doc/${sdocId}`)}
                    style={{ marginLeft: "16px", display: "inline-block", whiteSpace: "normal" }}
                  />
                ))}
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default DocumentViewer;
