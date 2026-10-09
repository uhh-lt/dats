import { useQuery } from "@tanstack/react-query";
import { projectQueries } from "./projectQueries";

// PROJECT QUERIES
// The queries themselves live in projectQueries. The hook below only derives data from them.

export const useGetProject = (projectId: number | null | undefined) =>
  useQuery({
    ...projectQueries.userProjects(),
    select: (data) => data.find((project) => project.id === projectId)!,
    enabled: !!projectId,
  });
