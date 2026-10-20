import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import type { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { queryOptions } from "@tanstack/react-query";

// mapping from project metadata id -> ProjectMetadataRead
export type ProjectMetadataMap = Record<number, ProjectMetadataRead>;

/**
 * Query factory for the metadata keys of a project.
 *
 *   projectMetadataQueries.all()                ["projectMetadata"]
 *   projectMetadataQueries.byProject(projectId) ["projectMetadata", "project", projectId]
 */
export const projectMetadataQueries = {
  all: () => ["projectMetadata"] as const,

  // project metadata (the metadata keys of a project), as a map by project metadata id
  byProjectScope: () => [...projectMetadataQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...projectMetadataQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const metadata = await ProjectMetadataService.getByProject({ projectId });
        return metadata.reduce<ProjectMetadataMap>((acc, m) => {
          acc[m.id] = m;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),
};
