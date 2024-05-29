import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { CheckboxState } from "../views/search/ToolBar/ToolBarElements/TagMenu/CheckboxState.ts";
import { QueryKey } from "./QueryKey.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SourceDocumentDocumentTagMultiLink } from "./openapi/models/SourceDocumentDocumentTagMultiLink.ts";
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

const useBulkLinkDocumentTags = () =>
  useMutation({
    mutationFn: (variables: { projectId: number; requestBody: SourceDocumentDocumentTagMultiLink }) =>
      DocumentTagService.linkMultipleTags({ requestBody: variables.requestBody }),
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUnlinkDocumentTags = () =>
  useMutation({
    mutationFn: (variables: { projectId: number; requestBody: SourceDocumentDocumentTagMultiLink }) =>
      DocumentTagService.unlinkMultipleTags({ requestBody: variables.requestBody }),
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUpdateDocumentTags = () =>
  useMutation({
    mutationFn: async (variables: {
      projectId: number;
      sourceDocumentIds: number[];
      initialState: Map<number, CheckboxState>;
      newState: Map<number, CheckboxState>;
    }) => {
      const addTags: number[] = [];
      const removeTags: number[] = [];

      variables.initialState.forEach((value, key) => {
        const newValue = variables.newState.get(key);
        if (value === CheckboxState.CHECKED && newValue === CheckboxState.NOT_CHECKED) {
          removeTags.push(key);
        } else if (value === CheckboxState.NOT_CHECKED && newValue === CheckboxState.CHECKED) {
          addTags.push(key);
        } else if (value === CheckboxState.INDETERMINATE && newValue === CheckboxState.CHECKED) {
          addTags.push(key);
        } else if (value === CheckboxState.INDETERMINATE && newValue === CheckboxState.NOT_CHECKED) {
          removeTags.push(key);
        }
      });

      const calls = [];
      if (addTags.length > 0) {
        calls.push(
          DocumentTagService.linkMultipleTags({
            requestBody: {
              source_document_ids: variables.sourceDocumentIds,
              document_tag_ids: addTags,
            },
          }),
        );
      }
      if (removeTags.length > 0) {
        DocumentTagService.unlinkMultipleTags({
          requestBody: {
            source_document_ids: variables.sourceDocumentIds,
            document_tag_ids: removeTags,
          },
        });
      }
      return await Promise.all(calls);
    },
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.sourceDocumentIds.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

// memos
const useGetMemos = (tagId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_TAG, tagId],
    queryFn: () => DocumentTagService.getMemos({ tagId: tagId! }),
    retry: false,
    enabled: !!tagId,
  });

const useGetMemo = (tagId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_TAG, tagId, userId],
    queryFn: () => DocumentTagService.getUserMemo({ tagId: tagId!, userId: userId! }),
    retry: false,
    enabled: !!tagId && !!userId,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: DocumentTagService.addMemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, data.user_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TAG, data.attached_object_id, data.user_id] });
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
  useBulkUpdateDocumentTags,
  useBulkLinkDocumentTags,
  useBulkUnlinkDocumentTags,
  useGetTagDocumentCounts,
  //memos
  useGetMemos,
  useGetMemo,
  useCreateMemo,
};

export default TagHooks;
