import { useMutation, useQuery } from "@tanstack/react-query";

import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { BBoxAnnotationReadResolved } from "./openapi/models/BBoxAnnotationReadResolved.ts";
import { DocType } from "./openapi/models/DocType.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SourceDocumentWithDataRead } from "./openapi/models/SourceDocumentWithDataRead.ts";
import { SpanAnnotationReadResolved } from "./openapi/models/SpanAnnotationReadResolved.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";
import { useSelectEnabledBboxAnnotations, useSelectEnabledSpanAnnotations } from "./utils.ts";

// sdoc
const fetchSdoc = async (sdocId: number) => {
  const sdoc = await SourceDocumentService.getById({
    sdocId: sdocId!,
  });

  switch (sdoc.doctype) {
    case DocType.TEXT:
      // dont do anything
      break;
    case DocType.IMAGE: {
      const url = await SourceDocumentService.getFileUrl({
        sdocId: sdocId,
        webp: true,
      });
      sdoc.content = encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + url);
      break;
    }
    case DocType.VIDEO:
    case DocType.AUDIO: {
      const url2 = await SourceDocumentService.getFileUrl({ sdocId: sdocId });
      sdoc.content = encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + url2);
      break;
    }
  }

  return sdoc;
};

const useGetDocument = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentWithDataRead, Error>({
    queryKey: [QueryKey.SDOC, sdocId],
    queryFn: () => fetchSdoc(sdocId!),
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
  });

const useDeleteDocuments = () =>
  useMutation({
    mutationFn: ({ sdocIds }: { sdocIds: number[] }) => {
      const promises = sdocIds.map((sdocId) => SourceDocumentService.deleteById({ sdocId: sdocId }));
      return Promise.all(promises);
    },
    onSuccess: (sdocs) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      sdocs.forEach((sdoc) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS, sdoc.project_id] });
      });
    },
  });

// tags
const useGetByTagId = (tagId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOCS_BY_TAG_ID, tagId],
    queryFn: () =>
      DocumentTagService.getSdocIdsByTagId({
        tagId: tagId!,
      }),
    enabled: !!tagId,
  });

const useGetAllDocumentTags = (sdocId: number | null | undefined) =>
  useQuery<DocumentTagRead[], Error>({
    queryKey: [QueryKey.SDOC_TAGS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAllTags({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });

// memo
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

const useGetRelatedMemos = (sdocId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_SDOC_RELATED, sdocId],
    queryFn: () =>
      SourceDocumentService.getRelatedUserMemos({
        sdocId: sdocId!,
      }),
    retry: false,
    enabled: !!sdocId,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: SourceDocumentService.addMemo,
    onSuccess: (memo) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, memo.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC, memo.attached_object_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, memo.attached_object_id] });
    },
  });

const useUpdateName = () =>
  useMutation({
    mutationFn: SourceDocumentService.updateSdoc,
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, sdoc.id] });
    },
  });

// metadata
const useGetURL = (sdocId: number | null | undefined, webp: boolean = false) =>
  useQuery<string, Error>({
    queryKey: [QueryKey.SDOC_URL, sdocId, webp],
    queryFn: () =>
      SourceDocumentService.getFileUrl({
        sdocId: sdocId!,
        relative: true,
        webp: webp,
      }),
    enabled: !!sdocId,
    select: (url) => encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + url),
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

const useGetMetadata = (sdocId: number | null | undefined) =>
  useQuery<SourceDocumentMetadataReadResolved[], Error>({
    queryKey: [QueryKey.SDOC_METADATAS, sdocId],
    queryFn: async () =>
      SourceDocumentService.getAllMetadata({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });

const useGetMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery<SourceDocumentMetadataReadResolved, Error>({
    queryKey: [QueryKey.SDOC_METADATA_BY_KEY, sdocId, key],
    queryFn: async () =>
      SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: key,
      }),
    enabled: !!sdocId,
  });

interface WordLevelTranscription {
  text: string;
  start_ms: number;
  end_ms: number;
}

const useGetWordLevelTranscriptions = (sdocId: number | null | undefined) =>
  useQuery<WordLevelTranscription[], Error>({
    queryKey: [QueryKey.SDOC_WORD_LEVEL_TRANSCRIPTIONS, sdocId],
    queryFn: async () => {
      const metadata = await SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: "word_level_transcriptions",
      });
      return JSON.parse(metadata.str_value!) as WordLevelTranscription[];
    },
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

const SdocHooks = {
  // sdoc
  useGetDocument,
  useGetLinkedSdocIds,
  useDeleteDocuments,
  useGetDocumentIdByFilename,
  // tags
  useGetByTagId,
  useGetAllDocumentTags,
  // annotations
  useGetAnnotators,
  useGetSpanAnnotationsBatch,
  useGetBBoxAnnotationsBatch,
  // memo
  useGetMemo,
  useGetRelatedMemos,
  useCreateMemo,
  // name
  useUpdateName,
  // metadata
  useGetURL,
  useGetThumbnailURL,
  useGetMetadata,
  useGetWordLevelTranscriptions,
  useGetMetadataByKey,
};

export default SdocHooks;
