import { Box, Card, CardContent, CardProps } from "@mui/material";
import React, { useRef } from "react";
import SdocHooks from "../../../api/SdocHooks.ts";

import { DocType } from "../../../api/openapi/models/DocType.ts";
import EditableDocumentName, {
  EditableDocumentNameHandle,
} from "../../../components/EditableDocumentName/EditableDocumentName.tsx";
import EditableDocumentNameButton from "../../../components/EditableDocumentName/EditableDocumentNameButton.tsx";
import AudioVideoViewer from "./AudioVideoViewer.tsx";
import { DocumentAdocSelector } from "./DocumentAdocSelector.tsx";
import ImageViewer from "./ImageViewer.tsx";
import TextViewer from "./TextViewer.tsx";
import { useSelectableAnnotationDocuments } from "./useSelectableAnnotationDocuments.ts";

interface DocumentViewerProps {
  sdocId: number | undefined;
  handleTagClick: (tagId: number) => void;
  showEntities: boolean;
  isIdleContent?: React.ReactNode;
}

function DocumentViewer({
  sdocId,
  showEntities,
  isIdleContent,
  ...props
}: DocumentViewerProps & Omit<CardProps, "raised">) {
  const editableDocumentNameHandle = useRef<EditableDocumentNameHandle>(null);

  // queries
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const { annotationDocuments, selectedAdoc, handleSelectAnnotationDocument } =
    useSelectableAnnotationDocuments(sdocId);

  // the queries are disabled if sdocId is undefined => show the idle content
  if (sdocId === undefined || sdocId === null) {
    return <Box {...props}>{isIdleContent}</Box>;
  }

  return (
    <Card raised {...props} sx={{ width: "150%" }}>
      <CardContent className="h100">
        <div style={{ display: "flex", alignItems: "center" }}>
          <EditableDocumentName
            sdocId={sdocId}
            variant={"h4"}
            style={{ margin: 0 }}
            inputProps={{ style: { fontSize: "2.125rem", padding: 0, width: "auto" } }}
            ref={editableDocumentNameHandle}
          />
          <EditableDocumentNameButton editableDocumentNameHandle={editableDocumentNameHandle.current} sx={{ ml: 1 }} />
        </div>
        <div>
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
              <div style={{ overflow: "auto", height: "100%" }}>
                <TextViewer sdoc={sdoc.data} adoc={selectedAdoc} showEntities={showEntities} />
              </div>
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
      </CardContent>
    </Card>
  );
}

export default DocumentViewer;
