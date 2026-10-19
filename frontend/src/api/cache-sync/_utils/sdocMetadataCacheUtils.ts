import { queryClient } from "@api/queryClient";
import { sdocMetadataQueries } from "@core/sdoc-metadata/api/sdocMetadataQueries";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";

// The SDOC_METADATAS cache is a per-sdoc map keyed by project_metadata_id
// (mirrors SdocMetadataMap in MetadataHooks). These helpers keep that map in
// sync when sdoc metadata changes.

// Insert or replace a metadata value in the per-sdoc map. An uncached map stays
// uncached: seeding it with only this value would hide the sdoc's other values.
export function upsertSdocMetadata(metadata: SourceDocumentMetadataRead): void {
  queryClient.setQueryData(sdocMetadataQueries.bySdoc(metadata.source_document_id).queryKey, (old) =>
    old ? { ...old, [metadata.project_metadata_id]: metadata } : old,
  );
}

// Remove a metadata value from the per-sdoc map.
export function removeSdocMetadata(metadata: SourceDocumentMetadataRead): void {
  queryClient.setQueryData(sdocMetadataQueries.bySdoc(metadata.source_document_id).queryKey, (old) => {
    if (!old) return old;
    const next = { ...old };
    delete next[metadata.project_metadata_id];
    return next;
  });
}
