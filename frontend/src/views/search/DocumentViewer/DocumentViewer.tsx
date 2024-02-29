import { Box, Card, CardContent, CardProps, Stack } from "@mui/material";
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../../api/SdocHooks.ts";

import { DocType } from "../../../api/openapi/models/DocType.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import EditableDocumentName, {
  EditableDocumentNameHandle,
} from "../../../components/EditableDocumentName/EditableDocumentName.tsx";
import EditableDocumentNameButton from "../../../components/EditableDocumentName/EditableDocumentNameButton.tsx";
import LexicalSearchResultCard from "../SearchResults/Cards/LexicalSearchResultCard.tsx";
import AudioVideoViewer from "./AudioVideoViewer.tsx";
import { DocumentAdocSelector } from "./DocumentAdocSelector.tsx";
import DocumentMetadata from "./DocumentMetadata/DocumentMetadata.tsx";
import DocumentTagChip from "./DocumentTagChip.tsx";
import ImageViewer from "./ImageViewer.tsx";
import TextViewer from "./TextViewer.tsx";
import { useDeletableDocumentTags } from "./useDeletableDocumentTags.ts";
import { useSelectableAnnotationDocuments } from "./useSelectableAnnotationDocuments.ts";

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

  const editableDocumentNameHandle = useRef<EditableDocumentNameHandle>(null);

  // queries
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const linkedSdocIds = SdocHooks.useGetLinkedSdocIds(sdocId);
  const { documentTags, handleDeleteDocumentTag } = useDeletableDocumentTags(sdocId);
  const { annotationDocuments, selectedAdoc, handleSelectAnnotationDocument } =
    useSelectableAnnotationDocuments(sdocId);

  // the queries are disabled if sdocId is undefined => show the idle content
  if (sdocId === undefined || sdocId === null) {
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Card raised {...props}>
      <CardContent className="h100">
        <Stack spacing={2} className="h100">
          <div style={{ display: "flex", alignItems: "center" }}>
            <EditableDocumentName
              sdocId={sdocId}
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
          <Stack direction="row" spacing={0.5}>
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
          </Stack>
          <div>
            <DocumentMetadata sdocId={sdocId} />
            {annotationDocuments.isLoading && <span>Loading annotation documents...</span>}
            {annotationDocuments.isError && <span>{annotationDocuments.error.message}</span>}
            {annotationDocuments.isSuccess && selectedAdoc && (
              <DocumentAdocSelector
                annotationDocuments={annotationDocuments.data}
                handleSelectAnnotationDocument={handleSelectAnnotationDocument}
                selectedAdoc={selectedAdoc}
              />
            )}
          </div>
          {sdoc.isSuccess && selectedAdoc && (
            <>
              {sdoc.data.doctype === DocType.TEXT && (
                <TextViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
              )}
              {sdoc.data.doctype === DocType.IMAGE && (
                <ImageViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
              )}
              {sdoc.data.doctype === DocType.AUDIO && (
                <AudioVideoViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} height={200} />
              )}
              {sdoc.data.doctype === DocType.VIDEO && (
                <AudioVideoViewer
                  sdoc={sdoc.data}
                  adoc={selectedAdoc}
                  showEntities={showEntities}
                  width={800}
                  height={600}
                />
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
