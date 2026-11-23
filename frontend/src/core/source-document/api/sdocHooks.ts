import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SourceDocumentUrls } from "@models/SourceDocumentUrls";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdocQueries } from "./sdocQueries";

// SDOC QUERIES
// The queries themselves live in sdocQueries. The hook below only derives data from them.

// the files are served from /content/
const toContentUrl = (url: string | null): string | null => (url === null ? null : encodeURI("/content/" + url));

// the URLs of the uploaded file, the WebP image and the thumbnail (null until computed)
const useGetURLs = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.urls(sdocId),
    select: (urls): SourceDocumentUrls => ({
      file_url: encodeURI("/content/" + urls.file_url),
      image_url: toContentUrl(urls.image_url),
      thumbnail_url: toContentUrl(urls.thumbnail_url),
    }),
  });

// the URL of the thumbnail (null until computed)
const useGetThumbnailURL = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.urls(sdocId),
    select: (urls) => toContentUrl(urls.thumbnail_url),
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
    ...sdocQueries.byId(sdocId!),
    enabled: !!sdocId,
  });

const useGetDocumentData = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.data(sdocId!),
    enabled: !!sdocId,
  });

export const SdocHooks = {
  useGetURLs,
  useGetThumbnailURL,
  useDeleteDocuments,
  useUpdateName,
  useGetDocument,
  useGetDocumentData,
};
