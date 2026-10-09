import { queryOptions } from "@tanstack/react-query";
import { getGitHubRelease } from "./githubRelease";

/**
 * Query factory for the GitHub release notes.
 *
 *   githubReleaseQueries.all()        ["githubRelease"]
 *   githubReleaseQueries.byTag(tag)   ["githubRelease", tag]
 */
export const githubReleaseQueries = {
  all: () => ["githubRelease"] as const,

  byTag: (tag: string) =>
    queryOptions({
      queryKey: [...githubReleaseQueries.all(), tag] as const,
      queryFn: () => getGitHubRelease(tag),
      retry: 1,
      staleTime: Infinity,
    }),
};
