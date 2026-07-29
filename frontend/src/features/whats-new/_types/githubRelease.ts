export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
}

export function isGitHubRelease(value: unknown): value is GitHubRelease {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "tag_name" in value &&
    typeof value.tag_name === "string" &&
    "name" in value &&
    (typeof value.name === "string" || value.name === null) &&
    "body" in value &&
    (typeof value.body === "string" || value.body === null) &&
    "html_url" in value &&
    typeof value.html_url === "string" &&
    "published_at" in value &&
    (typeof value.published_at === "string" || value.published_at === null)
  );
}
