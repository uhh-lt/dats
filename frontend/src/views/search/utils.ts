import * as d3 from "d3";

export const toThumbnailUrl = (url: string): string => {
  let pos = url.lastIndexOf(".");
  return url.slice(0, pos) + ".thumbnail.webp";
};

export const simSearchColorScale = d3.scaleLinear([0, 1 / 3, 2 / 3, 1], ["red", "orange", "gold", "yellowgreen"]);
