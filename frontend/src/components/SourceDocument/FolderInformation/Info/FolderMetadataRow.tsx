import { memo, useCallback } from "react";
import MetadataHooks, { SourceDocumentMetadataReadCombined } from "../../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import DocumentMetadataRowContent from "../../DocumentInformation/Info/DocumentMetadataRow/DocumentMetadataRowContent.tsx";

interface FolderDocumentMetadataRowProps {
  metadata: SourceDocumentMetadataReadCombined;
  onAddFilterClick: (metadata: SourceDocumentMetadataUpdate, projectMetadata: ProjectMetadataRead) => void;
}

function FolderDocumentMetadataRow({ metadata, onAddFilterClick }: FolderDocumentMetadataRowProps) {
  const projectMetadata = MetadataHooks.useGetProjectMetadata(metadata.project_metadata_id);

  // mutation
  const { mutate: updateMetadataMutation } = MetadataHooks.useUpdateBulkSdocMetadata();
  const handleMetadataUpdate = useCallback(
    (data: SourceDocumentMetadataUpdate) => {
      updateMetadataMutation({
        requestBody: metadata.ids.map((sdocMetadataId) => ({
          id: sdocMetadataId,
          str_value: data.str_value,
          int_value: data.int_value,
          date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
          boolean_value: data.boolean_value,
          list_value: data.list_value,
        })),
      });
    },
    [metadata, updateMetadataMutation],
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

export default memo(FolderDocumentMetadataRow);
