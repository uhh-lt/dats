import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";

// tags
const useGetTag = (tagId: number | null | undefined) =>
  useQuery<DocumentTagRead, Error>({
    queryKey: [QueryKey.TAG, tagId],
    queryFn: () => DocumentTagService.getById({ tagId: tagId! }),
    enabled: !!tagId,
  });

const useCreateTag = () =>
  useMutation({
    mutationFn: DocumentTagService.createNewDocTag,
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, tag.project_id] });
    },
  });

const useUpdateTag = () =>
  useMutation({
    mutationFn: DocumentTagService.updateById,
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG, tag.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, tag.project_id] });
    },
  });

const useDeleteTag = () =>
  useMutation({
    mutationFn: DocumentTagService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS] }); // todo welche sdocs sind eigentlich genau affected?
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkSetDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.setDocumentTagsBatch,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.forEach((links) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, links.source_document_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkLinkDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.linkMultipleTags,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUnlinkDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.unlinkMultipleTags,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUpdateDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.updateDocumentTagsBatch,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.sdoc_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

// memos
const useGetMemo = (tagId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_TAG, tagId],
    queryFn: () => DocumentTagService.getUserMemo({ tagId: tagId! }),
    retry: false,
    enabled: !!tagId,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: DocumentTagService.addMemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TAG, data.attached_object_id] });
    },
  });

const useGetTagDocumentCounts = (sdocIds: number[]) =>
  useQuery<Map<number, number>, Error>({
    queryKey: [QueryKey.TAG_SDOC_COUNT, sdocIds],
    queryFn: async () => {
      const stringRecord = await DocumentTagService.getSdocCounts({ requestBody: sdocIds });
      return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
    },
  });

const TagHooks = {
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkSetDocumentTags,
  useBulkUpdateDocumentTags,
  useBulkLinkDocumentTags,
  useBulkUnlinkDocumentTags,
  useGetTagDocumentCounts,
  //memos
  useGetMemo,
  useCreateMemo,
};

export default TagHooks;
