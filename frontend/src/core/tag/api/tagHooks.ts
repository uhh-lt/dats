import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { tagQueries } from "./tagQueries";

// TAG QUERIES
// The queries themselves (key + queryFn) live in tagQueries. The hook below only derives data from them.

export const useGetTag = (tagId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...tagQueries.byProject(projectId),
    select: (data) => data.find((tag) => tag.id === tagId)!,
    enabled: !!tagId,
  });
};
