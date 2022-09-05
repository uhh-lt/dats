import { Box, BoxProps, Button, Stack } from "@mui/material";
import { DocType, DocumentTagRead } from "../../../api/openapi";
import { useDeletableDocumentTags } from "./useDeletableDocumentTags";
import { useSelectableAnnotationDocuments } from "./useSelectableAnnotationDocuments";
import React from "react";
import TextViewer from "./TextViewer";
import DocumentTagChip from "./DocumentTagChip";
import SdocHooks from "../../../api/SdocHooks";
import DocumentMetadata from "./DocumentMetadata";
import TextKeywords from "./TextKeywords";
import ImageViewer from "./ImageViewer";
import DocumentLinkToOriginal from "./DocumentLinkToOriginal";

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
}: DocumentViewerProps & BoxProps) {
  // queries
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const { documentTags, handleDeleteDocumentTag } = useDeletableDocumentTags(sdocId);
  const { annotationDocuments, selectedAdoc, handleSelectAnnotationDocument } =
    useSelectableAnnotationDocuments(sdocId);

  // the queries are disabled if sdocId is undefined => show the idle content
  if (!sdocId) {
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Box {...(props as BoxProps)}>
      <Stack spacing={2} height={"100%"}>
        <Stack direction={"row"} spacing={1} sx={{ alignItems: "center" }}>
          {sdoc.isLoading && <h1 style={{ margin: 0 }}>Loading...</h1>}
          {sdoc.isError && <h1 style={{ margin: 0 }}>{sdoc.error.message}</h1>}
          {sdoc.isSuccess && (
            <DocumentLinkToOriginal sdocId={sdocId} title={sdoc.data.filename} variant={"h3"} style={{ margin: 0 }} />
          )}
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
        <DocumentMetadata sdocId={sdocId} />
        <Stack direction={"row"}>
          {annotationDocuments.isLoading && <span>Loading tags...</span>}
          {annotationDocuments.isError && <span>{annotationDocuments.error.message}</span>}
          {annotationDocuments.isSuccess &&
            annotationDocuments.data.map((adoc) => (
              <Button
                key={adoc.id}
                onClick={() => handleSelectAnnotationDocument(adoc)}
                sx={{ color: selectedAdoc?.id === adoc.id ? "red" : "black" }}
              >
                Annotations from User {adoc.user_id}
              </Button>
            ))}
        </Stack>

        {sdoc.isSuccess && selectedAdoc && (
          <>
            {sdoc.data.doctype === DocType.TEXT && (
              <>
                <TextKeywords sdocId={sdocId} />
                <TextViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
              </>
            )}
            {sdoc.data.doctype === DocType.IMAGE && (
              <>
                <ImageViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
              </>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

export default DocumentViewer;
