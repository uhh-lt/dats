import { useMutation, useQuery } from "@tanstack/react-query";

import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { BBoxAnnotationReadResolved } from "./openapi/models/BBoxAnnotationReadResolved.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SentenceAnnotatorResult } from "./openapi/models/SentenceAnnotatorResult.ts";
import { SourceDocumentDataRead } from "./openapi/models/SourceDocumentDataRead.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SourceDocumentRead } from "./openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "./openapi/models/SpanAnnotationReadResolved.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";
import { useSelectEnabledBboxAnnotations, useSelectEnabledSpanAnnotations } from "./utils.ts";

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

const useGetSpanAnnotationsBatch = (sdocId: number | null | undefined, userIds: number[] | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useQuery<SpanAnnotationReadResolved[], Error>({
    queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userIds],
    queryFn: () =>
      SourceDocumentService.getAllSpanAnnotationsBulk({
        sdocId: sdocId!,
        userId: userIds!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved[]>,
    enabled: !!sdocId && !!userIds,
    select: selectEnabledAnnotations,
  });
};

const useGetBBoxAnnotationsBatch = (sdocId: number | null | undefined, userIds: number[] | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledBboxAnnotations();
  return useQuery<BBoxAnnotationReadResolved[], Error>({
    queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS, sdocId, userIds],
    queryFn: () =>
      SourceDocumentService.getAllBboxAnnotationsBulk({
        sdocId: sdocId!,
        userId: userIds!,
        resolve: true,
      }) as Promise<BBoxAnnotationReadResolved[]>,
    enabled: !!sdocId && !!userIds,
    select: selectEnabledAnnotations,
  });
};

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

// memo
const useGetMemos = (sdocId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.SDOC_MEMOS, sdocId],
    queryFn: () =>
      SourceDocumentService.getMemos({
        sdocId: sdocId!,
      }),
    retry: false,
    enabled: !!sdocId,
  });

const useGetMemo = (sdocId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_SDOC, sdocId],
    queryFn: () =>
      SourceDocumentService.getUserMemo({
        sdocId: sdocId!,
      }),
    retry: false,
    enabled: !!sdocId,
  });

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
  useGetSpanAnnotationsBatch,
  useGetBBoxAnnotationsBatch,
  useGetSentenceAnnotator,
  // memo
  useGetMemo,
  useGetMemos,
  // name
  useUpdateName,
  // metadata
  useGetThumbnailURL,
  useGetMetadata,
  useGetMetadataByKey,
};

export default SdocHooks;
