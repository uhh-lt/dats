import { ProjectMetadataService } from "@api/services/ProjectMetadataService";
import type { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { queryOptions } from "@tanstack/react-query";

// mapping from project metadata id -> ProjectMetadataRead
export type ProjectMetadataMap = Record<number, ProjectMetadataRead>;

/**
 * Query factory for the metadata keys of a project.
 *
 *   projectMetadataQueries.all()                    ["projectMetadata"]
 *   projectMetadataQueries.projectScope(projectId)  ["projectMetadata", "project", projectId]
 *   projectMetadataQueries.byProject(projectId)     ["projectMetadata", "project", projectId]
 */
export const projectMetadataQueries = {
  all: () => ["projectMetadata"] as const,
  // prefix of all project metadata queries of one project
  projectScope: (projectId: number) => [...projectMetadataQueries.all(), "project", projectId] as const,

  // project metadata (the metadata keys of a project), as a map by project metadata id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: projectMetadataQueries.projectScope(projectId),
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
