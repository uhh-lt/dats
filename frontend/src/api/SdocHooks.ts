import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import {
  AnnotationDocumentRead,
  AnnotationDocumentService,
  DocType,
  DocumentTagRead,
  MemoRead,
  SourceDocumentContent,
  SourceDocumentKeywords,
  SourceDocumentMetadataRead,
  SourceDocumentRead,
  SourceDocumentService,
  SourceDocumentTokens,
  SpanAnnotationReadResolvedText,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import useStableQueries from "../utils/useStableQueries";
import queryClient from "../plugins/ReactQueryClient";

// sdoc
const fetchSdoc = async (sdocId: number) => {
  const sdoc = await SourceDocumentService.getById({
    sdocId: sdocId!,
  });
  switch (sdoc.doctype) {
    case DocType.TEXT:
      const x = await SourceDocumentService.getHtml({ sdocId: sdocId, onlyFinished: true });
      sdoc.content = x.html;
      break;
    case DocType.IMAGE:
      const url = await SourceDocumentService.getFileUrl({ sdocId: sdocId });
      sdoc.content = process.env.REACT_APP_CONTENT + "/" + url;
      break;
  }
  return sdoc;
};

const useGetDocumentNoContent = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_NO_CONTENT, sdocId],
    () =>
      SourceDocumentService.getById({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocument = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>([QueryKey.SDOC, sdocId], () => fetchSdoc(sdocId!), {
    enabled: !!sdocId,
  });

const useGetDocumentByAdocId = (adocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_BY_ADOC, adocId],
    async () => {
      const adoc = await AnnotationDocumentService.getByAdocId({ adocId: adocId! });
      return await fetchSdoc(adoc.source_document_id);
    },
    {
      enabled: !!adocId,
    }
  );

const useGetDocumentTokens = (sdocId: number | undefined) =>
  useQuery<SourceDocumentTokens, Error>(
    [QueryKey.SDOC_TOKENS, sdocId],
    () =>
      SourceDocumentService.getTokens({
        sdocId: sdocId!,
        characterOffsets: true,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocumentKeywords = (sdocId: number | undefined) =>
  useQuery<SourceDocumentKeywords, Error>(
    [QueryKey.SDOC_KEYWORDS, sdocId],
    () =>
      SourceDocumentService.getKeywords({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useUpdateDocumentKeywords = () =>
  useMutation(SourceDocumentService.updateKeywords, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.SDOC_KEYWORDS, sdoc.source_document_id]);
    },
  });

const useGetDocumentSentences = (sdocId: number | undefined) =>
  useQuery<SpanAnnotationReadResolvedText[], Error>(
    [QueryKey.SDOC_SENTENCES, sdocId],
    () =>
      SourceDocumentService.getSentences({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocumentContent = (sdocId: number | undefined) =>
  useQuery<SourceDocumentContent, Error>(
    [QueryKey.SDOC_CONTENT, sdocId],
    () =>
      SourceDocumentService.getContent({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useDeleteDocument = () =>
  useMutation(SourceDocumentService.deleteById, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, sdoc.project_id]);
    },
  });

// tags
const useGetAllDocumentTags = (sdocId: number | undefined) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.SDOC_TAGS, sdocId],
    () =>
      SourceDocumentService.getAllTags({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetAllDocumentTagsBatch = (sdocIds: number[]) =>
  useStableQueries(
    useQueries({
      queries: sdocIds.map((sdocId) => ({
        queryKey: [QueryKey.SDOC_TAGS, sdocId],
        queryFn: () =>
          SourceDocumentService.getAllTags({
            sdocId: sdocId,
          }),
      })),
    })
  );

const useRemoveDocumentTag = () =>
  useMutation(SourceDocumentService.unlinkTag, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdoc.id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id]);
    },
  });

// adoc
const useGetAllAnnotationDocuments = (sdocId: number | undefined) => {
  return useQuery<AnnotationDocumentRead[], Error>(
    [QueryKey.SDOC_ADOCS, sdocId],
    () =>
      SourceDocumentService.getAllAdocs({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );
};

// memo
const useGetMemos = (sdocId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SDOC, sdocId],
    () =>
      SourceDocumentService.getMemos({
        sdocId: sdocId!,
      }),
    {
      retry: false,
      enabled: !!sdocId,
    }
  );

const useGetMemo = (sdocId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_SDOC, sdocId, userId],
    () =>
      SourceDocumentService.getUserMemo({
        sdocId: sdocId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!sdocId && !!userId,
    }
  );

const useGetRelatedMemos = (sdocId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SDOC_RELATED, userId, sdocId],
    () =>
      SourceDocumentService.getRelatedUserMemos({
        sdocId: sdocId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!sdocId && !!userId,
    }
  );

const useCreateMemo = () =>
  useMutation(SourceDocumentService.addMemo, {
    onSuccess: (memo) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, memo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, memo.user_id, memo.attached_object_id]);
    },
  });

// metadata
const useGetURL = (sdocId: number | undefined) =>
  useQuery<string, Error>([QueryKey.SDOC_URL, sdocId], () => SourceDocumentService.getFileUrl({ sdocId: sdocId! }), {
    enabled: !!sdocId,
    select: (url) => process.env.REACT_APP_CONTENT + "/" + url,
  });

const useGetMetadata = (sdocId: number | undefined) =>
  useQuery<Map<string, SourceDocumentMetadataRead>, Error>(
    [QueryKey.SDOC_METADATAS, sdocId],
    async () => {
      const metadatas = await SourceDocumentService.getAllMetadata({ sdocId: sdocId! });
      const result = new Map<string, SourceDocumentMetadataRead>();
      metadatas.forEach((metadata) => {
        result.set(metadata.key, metadata);
      });
      return result;
    },
    {
      enabled: !!sdocId,
    }
  );

const SdocHooks = {
  // sdoc
  useGetDocument,
  useGetDocumentByAdocId,
  useGetDocumentNoContent,
  useGetDocumentTokens,
  useGetDocumentKeywords,
  useUpdateDocumentKeywords,
  useGetDocumentSentences,
  useGetDocumentContent,
  useDeleteDocument,
  // tags
  useGetAllDocumentTags,
  useGetAllDocumentTagsBatch,
  useRemoveDocumentTag,
  // adoc
  useGetAllAnnotationDocuments,
  // memo
  useGetMemos,
  useGetMemo,
  useGetRelatedMemos,
  useCreateMemo,
  // metadata
  useGetURL,
  useGetMetadata,
};

export default SdocHooks;
