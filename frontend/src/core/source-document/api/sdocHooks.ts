import { useMutation, useQuery } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { SourceDocumentRead } from "@models/SourceDocumentRead";

// SDOC QUERIES
// The queries themselves live in sdocQueries. The hook below only derives data from them.

// the thumbnail is served from /content/
const useGetThumbnailURL = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.thumbnailUrl(sdocId),
    select: (thumbnail_url) => encodeURI("/content/" + thumbnail_url),
  });

// SDOC MUTATIONS
const useDeleteDocuments = () =>
  useMutation({
    mutationKey: [...sdocQueries.all(), "deleteDocuments"],
    mutationFn: ({ sdocIds }: { sdocIds: number[] }) => SourceDocumentService.deleteSdocsBulk({ requestBody: sdocIds }),
    meta: {
      datsEvent: "SDOC_DELETED_BATCH",
      successMessage: (_data: SourceDocumentRead[], variables: { sdocIds: number[] }) =>
        `Successfully deleted ${variables.sdocIds.length} document(s)`,
    },
  });

const useUpdateName = () =>
  useMutation({
    mutationKey: [...sdocQueries.all(), "updateName"],
    mutationFn: SourceDocumentService.updateById,
    meta: {
      datsEvent: "SDOC_UPDATED",
      successMessage: (sdoc: SourceDocumentRead) => `Updated document "${sdoc.filename}"`,
    },
  });

export const SdocHooks = {
  useDeleteDocuments,
  useUpdateName,
  useGetThumbnailURL,
};
