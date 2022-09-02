import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import {
  DocumentTagService,
  MemoRead,
  DocumentTagRead,
  DocumentTagCreate,
  DocumentTagUpdate,
  MemoCreate,
  SourceDocumentDocumentTagMultiLink,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { CheckboxState } from "../views/search/Tags/TagMenu/TagMenu";

// tags
const useGetTag = (tagId: number | undefined) =>
  useQuery<DocumentTagRead, Error>(
    [QueryKey.TAG, tagId],
    () => DocumentTagService.getByIdDoctagTagIdGet({ tagId: tagId! }),
    {
      enabled: !!tagId,
    }
  );

const useCreateTag = (options: UseMutationOptions<DocumentTagRead, Error, { requestBody: DocumentTagCreate }>) =>
  useMutation(DocumentTagService.createNewDocTagDoctagPut, options);

const useUpdateTag = (
  options: UseMutationOptions<DocumentTagRead, Error, { tagId: number; requestBody: DocumentTagUpdate }>
) => useMutation(DocumentTagService.updateByIdDoctagTagIdPatch, options);

const useDeleteTag = (options: UseMutationOptions<DocumentTagRead, Error, { tagId: number }>) =>
  useMutation(DocumentTagService.deleteByIdDoctagTagIdDelete, options);

const useBulkLinkDocumentTags = (
  options: UseMutationOptions<number, Error, { requestBody: SourceDocumentDocumentTagMultiLink }>
) => useMutation(DocumentTagService.linkMultipleTagsDoctagBulkLinkPatch, options);

const useBulkUnlinkDocumentTags = (
  options: UseMutationOptions<number, Error, { requestBody: SourceDocumentDocumentTagMultiLink }>
) => useMutation(DocumentTagService.unlinkMultipleTagsDoctagBulkUnlinkDelete, options);

const useBulkUpdateDocumentTags = (
  options: UseMutationOptions<
    number[],
    Error,
    { sourceDocumentIds: number[]; initialState: Map<number, CheckboxState>; newState: Map<number, CheckboxState> }
  >
) =>
  useMutation(async (variables) => {
    let addTags: number[] = [];
    let removeTags: number[] = [];

    variables.initialState.forEach((value, key) => {
      let newValue = variables.newState.get(key);
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

    let calls = [];
    if (addTags.length > 0) {
      calls.push(
        DocumentTagService.linkMultipleTagsDoctagBulkLinkPatch({
          requestBody: {
            source_document_ids: variables.sourceDocumentIds,
            document_tag_ids: addTags,
          },
        })
      );
    }
    if (removeTags.length > 0) {
      DocumentTagService.unlinkMultipleTagsDoctagBulkUnlinkDelete({
        requestBody: {
          source_document_ids: variables.sourceDocumentIds,
          document_tag_ids: removeTags,
        },
      });
    }
    return await Promise.all(calls);
  }, options);

// memos
const useGetMemo = (tagId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_TAG, tagId],
    () => DocumentTagService.getMemoDoctagTagIdMemoGet({ tagId: tagId! }),
    {
      retry: false,
      enabled: !!tagId,
    }
  );

const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { tagId: number; requestBody: MemoCreate }>) =>
  useMutation(DocumentTagService.addMemoDoctagTagIdMemoPut, options);

const TagHooks = {
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkUpdateDocumentTags,
  useBulkLinkDocumentTags,
  useBulkUnlinkDocumentTags,
  //memos
  useGetMemo,
  useCreateMemo,
};

export default TagHooks;
