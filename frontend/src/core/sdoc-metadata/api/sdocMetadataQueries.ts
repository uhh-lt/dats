import { AnalysisService } from "@api/services/AnalysisService";
import { SdocMetadataService } from "@api/services/SdocMetadataService";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

// mapping from project metadata id -> SourceDocumentMetadataRead (one sdoc)
export type SdocMetadataMap = Record<number, SourceDocumentMetadataRead>;

/**
 * Query factory for the metadata values of source documents.
 *
 *   sdocMetadataQueries.all()                         ["sdocMetadata"]
 *   sdocMetadataQueries.bySdoc(sdocId)                ["sdocMetadata", "sdoc", sdocId]
 *   sdocMetadataQueries.bySdocAndKey(sdocId, key)     ["sdocMetadata", "sdocByKey", sdocId, key]
 *   sdocMetadataQueries.sdocCountWithDate(projId, id) ["sdocMetadata", "sdocCountWithDate", projId, metadataId]
 */
export const sdocMetadataQueries = {
  all: () => ["sdocMetadata"] as const,

  // metadata values of one sdoc, as a map by project metadata id
  bySdocScope: () => [...sdocMetadataQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.bySdocScope(), sdocId] as const,
      queryFn: !sdocId
        ? skipToken
        : async () => {
            const metadata = await SdocMetadataService.getBySdoc({ sdocId });
            return metadata.reduce<SdocMetadataMap>((acc, m) => {
              acc[m.project_metadata_id] = m;
              return acc;
            }, {});
          },
      staleTime: 1000 * 60 * 5,
    }),

  // legacy: one metadata value of an sdoc by its key (TODO: remove together with its hook)
  bySdocAndKeyScope: () => [...sdocMetadataQueries.all(), "sdocByKey"] as const,
  bySdocAndKeyOfSdocScope: (sdocId: number) => [...sdocMetadataQueries.bySdocAndKeyScope(), sdocId] as const,
  bySdocAndKey: (sdocId: number | null | undefined, key: string) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.bySdocAndKeyScope(), sdocId, key] as const,
      queryFn: !sdocId ? skipToken : () => SdocMetadataService.getBySdocAndKey({ sdocId, metadataKey: key }),
    }),

  // number of sdocs that have a valid date for a date metadata
  sdocCountWithDateScope: () => [...sdocMetadataQueries.all(), "sdocCountWithDate"] as const,
  sdocCountWithDate: (projectId: number, dateMetadataId: number) =>
    queryOptions({
      queryKey: [...sdocMetadataQueries.sdocCountWithDateScope(), projectId, dateMetadataId] as const,
      queryFn: () => AnalysisService.countSdocsWithDateMetadata({ projectId, dateMetadataId }),
    }),
};
