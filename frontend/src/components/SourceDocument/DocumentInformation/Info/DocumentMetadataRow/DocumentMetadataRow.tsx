import { memo, useCallback } from "react";
import MetadataHooks from "../../../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "../../../../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import DocumentMetadataRowContent from "./DocumentMetadataRowContent.tsx";

interface DocumentMetadataRowProps {
  metadata: SourceDocumentMetadataRead;
  onAddFilterClick: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

function DocumentMetadataRow({ metadata, onAddFilterClick }: DocumentMetadataRowProps) {
  const projectMetadata = MetadataHooks.useGetProjectMetadata(metadata.project_metadata_id);

  // mutation
  const { mutate: updateMetadataMutation } = MetadataHooks.useUpdateBulkSdocMetadata();
  const handleMetadataUpdate = useCallback(
    (data: SourceDocumentMetadataUpdate) => {
      updateMetadataMutation({
        requestBody: [
          {
            id: metadata.id,
            str_value: data.str_value,
            int_value: data.int_value,
            date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
            boolean_value: data.boolean_value,
            list_value: data.list_value,
          },
        ],
      });
    },
    [metadata.id, updateMetadataMutation],
  );

  if (projectMetadata.data) {
    return (
      <DocumentMetadataRowContent
        metadata={metadata}
        projectMetadata={projectMetadata.data}
        onAddFilterClick={onAddFilterClick}
        onUpdateMetadata={handleMetadataUpdate}
      />
    );
  }
  return null;
}

export default memo(DocumentMetadataRow);
