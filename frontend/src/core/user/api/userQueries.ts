import { UserService } from "@api/services/UserService";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for users.
 *
 *   userQueries.all()                           ["user"]
 *   userQueries.me(accessToken)                 ["user", "me", accessToken]
 *   userQueries.byProject(projectId)            ["user", "project", projectId]
 *   userQueries.annotatorsByProject(projectId)  ["user", "annotators", projectId]
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

  // the members of a project (human users only)
  byProjectScope: () => [...userQueries.all(), "project"] as const,
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...userQueries.byProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => UserService.getByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),

  // everybody who can own annotations in a project: its members, then its virtual annotators
  annotatorsByProjectScope: () => [...userQueries.all(), "annotators"] as const,
  annotatorsByProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...userQueries.annotatorsByProjectScope(), projectId] as const,
      queryFn: projectId === undefined ? skipToken : () => UserService.getAnnotatorsByProject({ projectId }),
      staleTime: 1000 * 60 * 5,
    }),
};
