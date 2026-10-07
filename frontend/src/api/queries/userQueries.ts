import { UserService } from "@api/services/UserService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for users.
 *
 *   userQueries.all()                      ["users"]
 *   userQueries.me(accessToken)            ["users", "me", accessToken]
 *   userQueries.byProject(projectId)       ["users", "project", projectId]
 */
export const userQueries = {
  all: () => ["users"] as const,

  // the logged-in user, resolved by access token
  meScope: () => [...userQueries.all(), "me"] as const,
  me: (accessToken: string | undefined) =>
    queryOptions({
      queryKey: [...userQueries.meScope(), accessToken] as const,
      queryFn: UserService.getMe,
      retry: false,
    }),

  // all users of a project
  byProjectScope: () => [...userQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...userQueries.byProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => UserService.getByProject({ projId: projectId }),
      staleTime: 1000 * 60 * 5,
    }),
};
