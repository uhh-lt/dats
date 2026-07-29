import { GitHubRelease, isGitHubRelease } from "../_types/githubRelease";

const GITHUB_RELEASES_API_URL = "https://api.github.com/repos/uhh-lt/dats/releases/tags";
const GITHUB_RELEASES_PAGE_URL = "https://github.com/uhh-lt/dats/releases/tag";

export function getGitHubReleasePageUrl(tag: string): string {
  return `${GITHUB_RELEASES_PAGE_URL}/${encodeURIComponent(tag)}`;
}

export async function getGitHubRelease(tag: string): Promise<GitHubRelease> {
  const response = await fetch(`${GITHUB_RELEASES_API_URL}/${encodeURIComponent(tag)}`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub returned status ${response.status} while loading the release notes.`);
  }

  const release: unknown = await response.json();
  if (!isGitHubRelease(release) || release.tag_name !== tag) {
    throw new Error("GitHub returned invalid release information.");
  }

  return release;
}
