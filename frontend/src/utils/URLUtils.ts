export function isValidHttpUrl(string: string): boolean {
  if (!string.trim()) return false;

  let url;
  try {
    url = new URL(string);
  } catch (e) {
    console.error(e);
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}
