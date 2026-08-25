import { queryClient } from "@api/queryClient";
import { MemoService } from "@api/services/MemoService";
import { SearchService } from "@api/services/SearchService";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import { MemoRead } from "@models/MemoRead";
import { Page_MemoRead_ } from "@models/Page_MemoRead_";
import { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// MEMO QUERIES
const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
    staleTime: 1000 * 60 * 5,
  });

const useGetObjectMemos = (
  attachedObjType: AttachedObjectType,
  attachedObjId: number | null | undefined,
  options?: { enabled?: boolean },
) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.OBJECT_MEMOS, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getMemosByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId && (options?.enabled ?? true),
    retry: false,
  });

const useQueryMemos = <TData = InfiniteData<Page_MemoRead_>>(
  request: QueryRequest_MemoColumns_,
  options?: { enabled?: boolean; select?: (data: InfiniteData<Page_MemoRead_>) => TData },
) =>
  useInfiniteQuery({
    queryKey: [QueryKey.MEMO_QUERY, request],
    queryFn: ({ pageParam }) => SearchService.searchMemos({ requestBody: { ...request, page_number: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined,
    enabled: options?.enabled ?? true,
    select: options?.select,
  });

const useQueryMemoGroups = (request: GroupQueryRequest_MemoColumns_, enabled = true) =>
  useInfiniteQuery({
    queryKey: [QueryKey.MEMO_GROUPS, request],
    queryFn: ({ pageParam }) => SearchService.searchMemoGroups({ requestBody: { ...request, page_number: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      pages.reduce((total, page) => total + page.items.length, 0) < lastPage.total_results ? pages.length : undefined,
    enabled,
  });

const useGetRecentMemos = (projectId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_RECENT, projectId],
    queryFn: () => MemoService.getRecentMemos({ projectId: projectId! }),
    enabled: !!projectId,
  });

const invalidateWorkspaceQueries = () => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_QUERY] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_GROUPS] });
};

// Invalidate the caches that hold the memo_ids of the attached object,
// so that memo indicators across the UI react to memo creation/deletion.
const invalidateAttachedObjectMemoIds = (attachedObjectType: AttachedObjectType, attachedObjectId: number) => {
  switch (attachedObjectType) {
    case AttachedObjectType.SOURCE_DOCUMENT:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC, attachedObjectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_MEMOS, attachedObjectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.TAG:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_TAGS] });
      break;
    case AttachedObjectType.CODE:
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES] });
      break;
    case AttachedObjectType.SPAN_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.SENTENCE_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    case AttachedObjectType.BBOX_ANNOTATION:
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SEARCH_TABLE] });
      break;
    default:
      break;
  }
};

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationFn: MemoService.addMemo,
    onSuccess: (data) => {
      queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
      queryClient.setQueryData<MemoRead[]>(
        [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
        (oldData) => (oldData ? [...oldData, data] : [data]),
      );
      invalidateAttachedObjectMemoIds(data.attached_object_type, data.attached_object_id);
      invalidateWorkspaceQueries();
    },
    meta: {
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

const updateInvalidation = (data: MemoRead) => {
  queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.map((memo) => (memo.id === data.id ? data : memo)) : [data]),
  );
};

const useUpdateMemo = () =>
  useMutation({
    mutationFn: MemoService.updateById,
    onSuccess: (data) => {
      updateInvalidation(data);
      invalidateWorkspaceQueries();
    },
    meta: {
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

const useFavoriteMemos = () =>
  useMutation({
    mutationFn: ({ memoIds, isFavorite }: { memoIds: number[]; isFavorite: boolean }) => {
      const promises = memoIds.map((memoId) =>
        isFavorite ? MemoService.favoriteById({ memoId }) : MemoService.unfavoriteById({ memoId }),
      );
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((memo) => {
        updateInvalidation(memo);
      });
      invalidateWorkspaceQueries();
    },
    meta: {
      successMessage: (memos: MemoRead[], variables: { memoIds: number[]; isFavorite: boolean }) =>
        `${variables.isFavorite ? "Favorited" : "Unfavorited"} ${memos.length} memo(s)`,
    },
  });

const deleteInvalidation = (data: MemoRead) => {
  queryClient.removeQueries({ queryKey: [QueryKey.MEMO, data.id] });
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.filter((memo) => memo.id !== data.id) : oldData),
  );
  invalidateAttachedObjectMemoIds(data.attached_object_type, data.attached_object_id);
};

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    onSuccess: (data) => {
      deleteInvalidation(data);
      invalidateWorkspaceQueries();
    },
    meta: {
      successMessage: (memo: MemoRead) => `Deleted memo "${memo.title}"`,
    },
  });

const useDeleteMemos = () =>
  useMutation({
    mutationFn: ({ memoIds }: { memoIds: number[] }) => {
      const promises = memoIds.map((memoId) => MemoService.deleteById({ memoId }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((data) => {
        deleteInvalidation(data);
      });
      invalidateWorkspaceQueries();
    },
    meta: {
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

const useRecordRecentMemo = () =>
  useMutation({
    mutationFn: ({ memoId }: { memoId: number; projectId: number }) => MemoService.recordRecentMemo({ memoId }),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_RECENT, projectId] });
    },
  });

export const MemoHooks = {
  useGetMemo,
  useGetObjectMemos,
  useQueryMemos,
  useQueryMemoGroups,
  useGetRecentMemos,
  useCreateMemo,
  useUpdateMemo,
  useFavoriteMemos,
  useDeleteMemo,
  useDeleteMemos,
  useRecordRecentMemo,
};
