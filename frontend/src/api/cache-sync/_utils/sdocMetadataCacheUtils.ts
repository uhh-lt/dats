import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";

// The SDOC_METADATAS cache is a per-sdoc map keyed by project_metadata_id
// (mirrors SdocMetadataMap in MetadataHooks). These helpers keep that map in
// sync when sdoc metadata changes.

// Insert or replace a metadata value in the per-sdoc map.
export function upsertSdocMetadata(metadata: SourceDocumentMetadataRead): void {
  queryClient.setQueryData<Record<number, SourceDocumentMetadataRead>>(
    [QueryKey.SDOC_METADATAS, metadata.source_document_id],
    (old) =>
      old ? { ...old, [metadata.project_metadata_id]: metadata } : { [metadata.project_metadata_id]: metadata },
  );
}

// Remove a metadata value from the per-sdoc map.
export function removeSdocMetadata(metadata: SourceDocumentMetadataRead): void {
  queryClient.setQueryData<Record<number, SourceDocumentMetadataRead>>(
    [QueryKey.SDOC_METADATAS, metadata.source_document_id],
    (old) => {
      if (!old) return old;
      const next = { ...old };
      delete next[metadata.project_metadata_id];
      return next;
    },
  );
}
