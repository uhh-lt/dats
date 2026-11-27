import { SourceDocumentMetadataService } from "@api/services/SourceDocumentMetadataService";
import { SourceDocumentsService } from "@api/services/SourceDocumentsService";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

// mapping from project metadata id -> SourceDocumentMetadataRead (one sdoc)
export type SdocMetadataMap = Record<number, SourceDocumentMetadataRead>;

/**
 * Query factory for the metadata values of source documents.
 *
 *   sdocMetadataQueries.all()                                ["sdocMetadata"]
 *   sdocMetadataQueries.projectScope(projectId)              ["sdocMetadata", "project", projectId]
 *   sdocMetadataQueries.bySdoc(projectId, sdocId)            ["sdocMetadata", "project", projectId, "sdoc", sdocId]
 *   sdocMetadataQueries.bySdocAndKey(projectId, sdocId, key) ["sdocMetadata", "project", projectId, "sdocByKey", sdocId, key]
 *   sdocMetadataQueries.sdocCountWithDate(projectId, id)     ["sdocMetadata", "project", projectId, "sdocCountWithDate", id]
 */
export const sdocMetadataQueries = {
  all: () => ["sdocMetadata"] as const,
  // prefix of all sdoc metadata queries of one project
  projectScope: (projectId: number | null | undefined) => [...sdocMetadataQueries.all(), "project", projectId] as const,

  // metadata values of one sdoc, as a map by project metadata id
  bySdocScope: (projectId: number | null | undefined) =>
    [...sdocMetadataQueries.projectScope(projectId), "sdoc"] as const,
  bySdoc: (projectId: number | null | undefined, sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.bySdocScope(projectId), sdocId] as const,
      queryFn:
        !projectId || !sdocId
          ? skipToken
          : async () => {
              const metadata = await SourceDocumentMetadataService.getByProject({ projectId, sdocId });
              return metadata.reduce<SdocMetadataMap>((acc, m) => {
                acc[m.project_metadata_id] = m;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),

  // legacy: one metadata value of an sdoc by its key (TODO: remove together with its hook)
  bySdocAndKeyScope: (projectId: number | null | undefined) =>
    [...sdocMetadataQueries.projectScope(projectId), "sdocByKey"] as const,
  bySdocAndKeyOfSdocScope: (projectId: number, sdocId: number) =>
    [...sdocMetadataQueries.bySdocAndKeyScope(projectId), sdocId] as const,
  bySdocAndKey: (projectId: number | null | undefined, sdocId: number | null | undefined, key: string) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.bySdocAndKeyScope(projectId), sdocId, key] as const,
      queryFn:
        !projectId || !sdocId
          ? skipToken
          : async () => {
              const [metadata] = await SourceDocumentMetadataService.getByProject({ projectId, sdocId, key });
              if (!metadata) throw new Error(`The document has no metadata "${key}"`);
              return metadata;
            },
    }),

  // number of sdocs that have a valid date for a date metadata
  sdocCountWithDateScope: (projectId: number) =>
    [...sdocMetadataQueries.projectScope(projectId), "sdocCountWithDate"] as const,
  sdocCountWithDate: (projectId: number, dateMetadataId: number) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.sdocCountWithDateScope(projectId), dateMetadataId] as const,
      queryFn: async () => {
        const [sdocsWithDate, sdocsTotal] = await Promise.all([
          SourceDocumentsService.count({ projectId, dateMetadataId }),
          SourceDocumentsService.count({ projectId }),
        ]);
        return { sdocs_with_date: sdocsWithDate, sdocs_total: sdocsTotal };
      },
    }),
};
