import { useMutation, useQuery } from "@tanstack/react-query";

import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SentenceAnnotatorResult } from "./openapi/models/SentenceAnnotatorResult.ts";
import { SourceDocumentDataRead } from "./openapi/models/SourceDocumentDataRead.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SourceDocumentRead } from "./openapi/models/SourceDocumentRead.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";

// SDOC QUERIES
const useGetDocument = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentRead, Error>({
    queryKey: [QueryKey.SDOC, sdocId],
    queryFn: () => SourceDocumentService.getById({ sdocId: sdocId! }),
    enabled: !!sdocId,
    staleTime: Infinity,
  });

const useGetDocumentData = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentDataRead, Error>({
    queryKey: [QueryKey.SDOC_DATA, sdocId],
    queryFn: () => SourceDocumentService.getByIdWithData({ sdocId: sdocId! }),
    enabled: !!sdocId,
    staleTime: Infinity,
  });

const useGetDocumentIdByFilename = (filename: string | undefined, projectId: number) =>
  useQuery<number | null | undefined, Error>({
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

const useGetLinkedSdocIds = (sdocId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_LINKS, sdocId],
    queryFn: () =>
      SourceDocumentService.getLinkedSdocs({
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
    select: (thumbnail_url) => encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + thumbnail_url),
    staleTime: Infinity,
  });

const useGetSdocIdsByTagId = (tagId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_IDS_BY_TAG_ID, tagId],
    queryFn: () =>
      DocumentTagService.getSdocIdsByTagId({
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
  });

const useUpdateName = () =>
  useMutation({
    mutationFn: SourceDocumentService.updateSdoc,
    onSuccess: (data) => {
      queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, data.id], data);
    },
  });

// metadata
const useGetMetadata = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentMetadataReadResolved[], Error>({
    queryKey: [QueryKey.SDOC_METADATAS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAllMetadata({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });

const useGetMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery<SourceDocumentMetadataReadResolved, Error>({
    queryKey: [QueryKey.SDOC_METADATA_BY_KEY, sdocId, key],
    queryFn: () =>
      SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: key,
      }),
    enabled: !!sdocId,
  });

// annotations
const useGetAnnotators = (sdocId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_ANNOTATORS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAnnotators({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });

const useGetSentenceAnnotator = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  // TODO: filter out all disabled code ids
  return useQuery<SentenceAnnotatorResult, Error>({
    queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, sdocId, userId],
    queryFn: () =>
      SourceDocumentService.getSentenceAnnotator({
        sdocId: sdocId!,
        userId: userId!,
      }),
    enabled: !!sdocId && !!userId,
  });
};

const SdocHooks = {
  // sdoc
  useGetDocument,
  useGetDocumentData,
  useGetLinkedSdocIds,
  useDeleteDocuments,
  useGetDocumentIdByFilename,
  // tags
  useGetSdocIdsByTagId,
  // annotations
  useGetAnnotators,
  useGetSentenceAnnotator,
  // name
  useUpdateName,
  // metadata
  useGetThumbnailURL,
  useGetMetadata,
  useGetMetadataByKey,
};

export default SdocHooks;
