export const toThumbnailUrl = (url: string): string => {
  let pos = url.lastIndexOf(".");
  console.log(pos);
  return url.slice(0, pos) + "_thumbnail.webp";
};
