const GITHUB_RELEASES_PAGE_URL = "https://github.com/uhh-lt/dats/releases/tag";

export function getGitHubReleasePageUrl(tag: string): string {
  return `${GITHUB_RELEASES_PAGE_URL}/${encodeURIComponent(tag)}`;
}
