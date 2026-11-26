import { UserService } from "@api/services/UserService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for users.
 *
 *   userQueries.all()                      ["user"]
 *   userQueries.me(accessToken)            ["user", "me", accessToken]
 *   userQueries.projectScope(projectId)    ["user", "project", projectId]
 *   userQueries.byProject(projectId)       ["user", "project", projectId]
 */
export const userQueries = {
  all: () => ["user"] as const,

  // the logged-in user, resolved by access token
  meScope: () => [...userQueries.all(), "me"] as const,
  me: (accessToken: string | undefined) =>
    queryOptions({
      queryKey: [...userQueries.meScope(), accessToken] as const,
      queryFn: UserService.getMe,
      retry: false,
    }),

  // prefix of all user queries of one project
  projectScope: (projectId: number | undefined) => [...userQueries.all(), "project", projectId] as const,

  // all users of a project: its members, then its virtual users
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: userQueries.projectScope(projectId),
      queryFn: projectId === undefined ? skipToken : () => UserService.getByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),
};
