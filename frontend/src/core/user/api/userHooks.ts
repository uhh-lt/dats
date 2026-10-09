import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { userQueries } from "./userQueries";

// USER QUERIES
// The queries themselves live in userQueries. The hook below only derives data from them.

export const useGetUser = (userId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.byProject(projectId),
    select: (data) => data.find((user) => user.id === userId)!,
    enabled: !!userId,
  });
};
