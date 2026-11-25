import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SourceDocumentUrls } from "@models/SourceDocumentUrls";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@store/storeHooks";
import { sdocQueries } from "./sdocQueries";

// SDOC QUERIES
// The queries themselves live in sdocQueries. The hooks below only derive data from them; they add the project.

const useProjectId = () => useAppSelector((state) => state.project.projectId);

// the files are served from /content/
const toContentUrl = (url: string | null): string | null => (url === null ? null : encodeURI("/content/" + url));

// the URLs of the uploaded file, the WebP image and the thumbnail (null until computed)
const useGetURLs = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.urls(useProjectId(), sdocId),
    select: (urls): SourceDocumentUrls => ({
      file_url: encodeURI("/content/" + urls.file_url),
      image_url: toContentUrl(urls.image_url),
      thumbnail_url: toContentUrl(urls.thumbnail_url),
    }),
  });

// the URL of the thumbnail (null until computed)
const useGetThumbnailURL = (sdocId: number | null | undefined) =>
  useQuery({
    ...sdocQueries.urls(useProjectId(), sdocId),
    select: (urls) => toContentUrl(urls.thumbnail_url),
  });

// SDOC MUTATIONS
const useDeleteDocuments = () =>
  useMutation({
    mutationKey: [...sdocQueries.all(), "deleteDocuments"],
    mutationFn: ({ projectId, sdocIds }: { projectId: number; sdocIds: number[] }) =>
      SourceDocumentService.deleteSdocsBulk({ projectId, requestBody: sdocIds }),
    meta: {
      datsEvent: "SDOC_DELETED_BATCH",
      successMessage: (_data: SourceDocumentRead[], variables: { projectId: number; sdocIds: number[] }) =>
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

const useGetDocument = (sdocId: number | null | undefined) => {
  const projectId = useProjectId();
  return useQuery({ ...sdocQueries.byId(projectId!, sdocId!), enabled: !!projectId && !!sdocId });
};

const useGetDocumentData = (sdocId: number | null | undefined) => {
  const projectId = useProjectId();
  return useQuery({ ...sdocQueries.data(projectId!, sdocId!), enabled: !!projectId && !!sdocId });
};

export const SdocHooks = {
  useGetURLs,
  useGetThumbnailURL,
  useDeleteDocuments,
  useUpdateName,
  useGetDocument,
  useGetDocumentData,
};
