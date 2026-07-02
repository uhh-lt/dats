export function isValidHttpUrl(string: string): boolean {
  if (!string.trim()) return false;

  let url;
  try {
    url = new URL(string);
  } catch {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}
