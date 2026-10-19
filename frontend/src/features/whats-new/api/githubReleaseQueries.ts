import { queryOptions } from "@tanstack/react-query";
import { GitHubRelease, isGitHubRelease } from "../_types/githubRelease";

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
      queryFn: async (): Promise<GitHubRelease> => {
        const response = await fetch(
          `https://api.github.com/repos/uhh-lt/dats/releases/tags/${encodeURIComponent(tag)}`,
          {
            headers: { Accept: "application/vnd.github+json" },
          },
        );
        if (!response.ok) {
          throw new Error(`GitHub returned status ${response.status} while loading the release notes.`);
        }

        const release: unknown = await response.json();
        if (!isGitHubRelease(release) || release.tag_name !== tag) {
          throw new Error("GitHub returned invalid release information.");
        }
        return release;
      },
      retry: 1,
      staleTime: Infinity,
    }),
};
