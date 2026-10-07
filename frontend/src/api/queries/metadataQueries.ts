import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import { SdocMetadataService } from "@api/services/SdocMetadataService";
import type { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

// mapping from project metadata id -> ProjectMetadataRead
export type ProjectMetadataMap = Record<number, ProjectMetadataRead>;
// mapping from project metadata id -> SourceDocumentMetadataRead (one sdoc)
export type SdocMetadataMap = Record<number, SourceDocumentMetadataRead>;

/**
 * Query factory for project metadata and source document metadata.
 *
 *   metadataQueries.all()                         ["metadata"]
 *   metadataQueries.byProject(projectId)          ["metadata", "project", projectId]
 *   metadataQueries.bySdoc(sdocId)                ["metadata", "sdoc", sdocId]
 *   metadataQueries.bySdocAndKey(sdocId, key)     ["metadata", "sdocByKey", sdocId, key]
 */
export const metadataQueries = {
  all: () => ["metadata"] as const,

  // project metadata (the metadata keys of a project), as a map by project metadata id
  byProjectScope: () => [...metadataQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...metadataQueries.byProjectScope(), projectId] as const,
      queryFn:
        projectId === undefined
          ? skipToken
          : async () => {
              const metadata = await ProjectMetadataService.getByProject({ projId: projectId });
              return metadata.reduce<ProjectMetadataMap>((acc, m) => {
                acc[m.id] = m;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),

  // same as `byProject`, for useSuspenseQuery / route loaders: the id is known, so there is no skipToken
  byProjectRequired: (projectId: number) =>
    queryOptions({
      queryKey: [...metadataQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const metadata = await ProjectMetadataService.getByProject({ projId: projectId });
        return metadata.reduce<ProjectMetadataMap>((acc, m) => {
          acc[m.id] = m;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // metadata values of one sdoc, as a map by project metadata id
  bySdocScope: () => [...metadataQueries.all(), "sdoc"] as const,
  bySdoc: (sdocId: number | null | undefined) =>
    queryOptions({
      queryKey: [...metadataQueries.bySdocScope(), sdocId] as const,
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
  bySdocAndKeyScope: () => [...metadataQueries.all(), "sdocByKey"] as const,
  bySdocAndKeyOfSdocScope: (sdocId: number) => [...metadataQueries.bySdocAndKeyScope(), sdocId] as const,
  bySdocAndKey: (sdocId: number | null | undefined, key: string) =>
    queryOptions({
      queryKey: [...metadataQueries.bySdocAndKeyScope(), sdocId, key] as const,
      queryFn: !sdocId ? skipToken : () => SdocMetadataService.getBySdocAndKey({ sdocId, metadataKey: key }),
    }),
};
