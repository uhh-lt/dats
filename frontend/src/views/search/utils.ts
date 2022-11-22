export const toThumbnailUrl = (url: string): string => {
  let pos = url.lastIndexOf(".");
  return url.slice(0, pos) + "_thumbnail.webp";
};
