import { UseQueryResult } from "@tanstack/react-query";
import SdocHooks from "../../../../api/SdocHooks";

export function ThumbnailURL(sdocId: number) {
  return SdocHooks.useGetThumbnailURL(sdocId).data ?? "";
}
