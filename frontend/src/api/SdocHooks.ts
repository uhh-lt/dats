import { useMutation, useQuery } from "@tanstack/react-query";

import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { AnnotationDocumentRead } from "./openapi/models/AnnotationDocumentRead.ts";
import { DocType } from "./openapi/models/DocType.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SourceDocumentMetadataReadResolved } from "./openapi/models/SourceDocumentMetadataReadResolved.ts";
import { SourceDocumentWithDataRead } from "./openapi/models/SourceDocumentWithDataRead.ts";
import { AnnotationDocumentService } from "./openapi/services/AnnotationDocumentService.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";

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

const useGetDocumentByAdocId = (adocId: number | null | undefined) =>
  useQuery<SourceDocumentWithDataRead, Error>({
    queryKey: [QueryKey.SDOC_BY_ADOC, adocId],
    queryFn: async () => {
      const adoc = await AnnotationDocumentService.getByAdocId({
        adocId: adocId!,
      });
      return await fetchSdoc(adoc.source_document_id);
    },
    enabled: !!adocId,
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

const useDeleteDocument = () =>
  useMutation({
    mutationFn: SourceDocumentService.deleteById,
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS, sdoc.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS_INFINITE, sdoc.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, sdoc.project_id] });
    },
  });

const useDeleteDocuments = () =>
  useMutation({
    mutationFn: ({ sdocIds }: { sdocIds: number[] }) => {
      const promises = sdocIds.map((sdocId) => SourceDocumentService.deleteById({ sdocId: sdocId }));
      return Promise.all(promises);
    },
    onSuccess: (sdocs) => {
      sdocs.forEach((sdoc) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS, sdoc.project_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS_INFINITE, sdoc.project_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, sdoc.project_id] });
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

// adoc
const useGetAllAnnotationDocuments = (sdocId: number | null | undefined) => {
  return useQuery<AnnotationDocumentRead[], Error>({
    queryKey: [QueryKey.SDOC_ADOCS, sdocId],
    queryFn: () =>
      SourceDocumentService.getAllAdocs({
        sdocId: sdocId!,
      }),
    enabled: !!sdocId,
  });
};

const useGetOrCreateAdocOfUser = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  return useQuery<AnnotationDocumentRead, Error>({
    queryKey: [QueryKey.SDOC_ADOC_USER, sdocId, userId],
    queryFn: () =>
      SourceDocumentService.getAdocOfUser({
        sdocId: sdocId!,
        userId: userId!,
      }),
    enabled: !!sdocId && !!userId,
  });
};

// memo
const useGetMemos = (sdocId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_SDOC, sdocId],
    queryFn: () =>
      SourceDocumentService.getMemos({
        sdocId: sdocId!,
      }),
    retry: false,
    enabled: !!sdocId,
  });

const useGetMemo = (sdocId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_SDOC, sdocId, userId],
    queryFn: () =>
      SourceDocumentService.getUserMemo({
        sdocId: sdocId!,
        userId: userId!,
      }),
    retry: false,
    enabled: !!sdocId && !!userId,
  });

const useGetRelatedMemos = (sdocId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_SDOC_RELATED, userId, sdocId],
    queryFn: () =>
      SourceDocumentService.getRelatedUserMemos({
        sdocId: sdocId!,
        userId: userId!,
      }),
    retry: false,
    enabled: !!sdocId && !!userId,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: SourceDocumentService.addMemo,
    onSuccess: (memo) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, memo.user_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC, memo.attached_object_id, memo.user_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_SDOC_RELATED, memo.user_id, memo.attached_object_id] });
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

const useGetWordFrequencies = (sdocId: number | null | undefined) =>
  useQuery<{ text: string; value: number }[], Error>({
    queryKey: [QueryKey.SDOC_WORD_FREQUENCIES, sdocId],
    queryFn: async () => {
      const wordFrequencies = await SourceDocumentService.getWordFrequencies({
        sdocId: sdocId!,
      });

      const entries: [string, number][] = wordFrequencies.map((wf) => [wf.word, wf.count]);
      entries.sort((a, b) => b[1] - a[1]); // sort array descending
      return entries.slice(0, 20).map((e) => {
        return { text: e[0], value: e[1] };
      });
    },
    enabled: !!sdocId,
    staleTime: Infinity,
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

const SdocHooks = {
  // sdoc
  useGetDocument,
  useGetDocumentByAdocId,
  useGetLinkedSdocIds,
  useDeleteDocument,
  useDeleteDocuments,
  useGetDocumentIdByFilename,
  // tags
  useGetByTagId,
  useGetAllDocumentTags,
  // adoc
  useGetAllAnnotationDocuments,
  useGetOrCreateAdocOfUser,
  // memo
  useGetMemos,
  useGetMemo,
  useGetRelatedMemos,
  useCreateMemo,
  // name
  useUpdateName,
  // metadata
  useGetURL,
  useGetThumbnailURL,
  useGetMetadata,
  useGetWordFrequencies,
  useGetWordLevelTranscriptions,
  useGetMetadataByKey,
};

export default SdocHooks;
