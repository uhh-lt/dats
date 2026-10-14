import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

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

const useGetDocument = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.detail(sdocId!),
    enabled: !!sdocId,
  });

const useGetDocumentData = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.data(sdocId!),
    enabled: !!sdocId,
  });

const useGetDocumentIdByFilename = (filename: string | undefined, projectId: number) =>
  useQuery(sdocQueries.idByFilename(projectId, filename));

const useGetSameFolderSdocIds = (sdocId: number | null | undefined) => useQuery(sdocQueries.sameFolder(sdocId));

const useGetSdocIdsByTagId = (tagId: number | null | undefined) => useQuery(sdocQueries.idsByTag(tagId));

const useGetAnnotators = (sdocId: number | null | undefined) => useQuery(sdocQueries.annotators(sdocId));

export const SdocHooks = {
  useGetThumbnailURL,
  useDeleteDocuments,
  useUpdateName,
  useGetDocument,
  useGetDocumentData,
  useGetDocumentIdByFilename,
  useGetSameFolderSdocIds,
  useGetSdocIdsByTagId,
  useGetAnnotators,
};
