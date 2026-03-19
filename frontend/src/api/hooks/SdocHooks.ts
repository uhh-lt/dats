import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

import { SourceDocumentDataRead } from "@api/models/SourceDocumentDataRead";
import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { queryClient } from "@api/queryClient";
import { ProjectService } from "@api/services/ProjectService";
import { SourceDocumentService } from "@api/services/SourceDocumentService";
import { TagService } from "@api/services/TagService";
import { QueryKey } from "./QueryKey";

// SDOC QUERIES
const getDocumentQueryOptions = (sdocId: number) =>
  queryOptions<SourceDocumentRead, Error>({
    queryKey: [QueryKey.SDOC, sdocId],
    queryFn: () => SourceDocumentService.getById({ sdocId }),
    staleTime: Infinity,
  });

const useGetDocument = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentRead, Error>({
    ...getDocumentQueryOptions(sdocId!),
    enabled: !!sdocId,
  });

const getDocumentDataQueryOptions = (sdocId: number) =>
  queryOptions<SourceDocumentDataRead, Error>({
    queryKey: [QueryKey.SDOC_DATA, sdocId],
    queryFn: () => SourceDocumentService.getByIdWithData({ sdocId }),
    staleTime: Infinity,
  });

const useGetDocumentData = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentDataRead, Error>({
    ...getDocumentDataQueryOptions(sdocId!),
    enabled: !!sdocId,
  });

const useGetDocumentIdByFilename = (filename: string | undefined, projectId: number) =>
  useQuery<number, Error>({
    queryKey: [QueryKey.SDOC_ID, projectId, filename],
    queryFn: () =>
      ProjectService.resolveFilename({
        projId: projectId,
        filename: filename!,
        onlyFinished: true,
      }),
    enabled: !!filename,
    staleTime: Infinity,
  });

const useGetSameFolderSdocIds = (sdocId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_SAME_FOLDER, sdocId],
    queryFn: () =>
      SourceDocumentService.getSameFolderSdocs({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
    staleTime: Infinity,
  });

const useGetThumbnailURL = (sdocId: number | null | undefined) =>
  useQuery<string, Error>({
    queryKey: [QueryKey.SDOC_THUMBNAIL_URL, sdocId],
    queryFn: () =>
      SourceDocumentService.getFileUrl({
        sdocId: sdocId!,
        relative: true,
        webp: true,
        thumbnail: true,
      }),
    enabled: !!sdocId,
    select: (thumbnail_url) => encodeURI("/content/" + thumbnail_url),
    staleTime: Infinity,
  });

const useGetSdocIdsByTagId = (tagId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_IDS_BY_TAG_ID, tagId],
    queryFn: () =>
      TagService.getSdocIdsByTagId({
        tagId: tagId!,
      }),
    enabled: !!tagId,
  });

// SDOC MUTATIONS
const useDeleteDocuments = () =>
  useMutation({
    mutationFn: ({ sdocIds }: { sdocIds: number[] }) => {
      const promises = sdocIds.map((sdocId) => SourceDocumentService.deleteById({ sdocId: sdocId }));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
    },
    meta: {
      successMessage: (_data: SourceDocumentRead[], variables: { sdocIds: number[] }) =>
        `Successfully deleted ${variables.sdocIds.length} document(s)`,
    },
  });

const useUpdateName = () =>
  useMutation({
    mutationFn: SourceDocumentService.updateSdoc,
    onSuccess: (data) => {
      queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, data.id], data);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
    },
    meta: {
      successMessage: (sdoc: SourceDocumentRead) => `Updated document "${sdoc.filename}"`,
    },
  });

// annotations
const useGetAnnotators = (sdocId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_ANNOTATORS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAnnotators({
        sdocId: sdocId!,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!sdocId,
  });

export const SdocHooks = {
  // sdoc
  getDocumentQueryOptions,
  getDocumentDataQueryOptions,
  useGetDocument,
  useGetDocumentData,
  useGetSameFolderSdocIds,
  useDeleteDocuments,
  useGetDocumentIdByFilename,
  // tags
  useGetSdocIdsByTagId,
  // annotations
  useGetAnnotators,
  // name
  useUpdateName,
  // thumbnail
  useGetThumbnailURL,
};
