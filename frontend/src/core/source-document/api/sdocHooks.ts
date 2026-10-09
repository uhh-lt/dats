import { useQuery } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

// SDOC QUERIES
// The queries themselves live in sdocQueries. The hook below only derives data from them.

// the thumbnail is served from /content/
export const useGetThumbnailURL = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.thumbnailUrl(sdocId),
    select: (thumbnail_url) => encodeURI("/content/" + thumbnail_url),
  });
