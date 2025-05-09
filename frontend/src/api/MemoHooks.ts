import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { CodeMap } from "./CodeHooks.ts";
import { QueryKey } from "./QueryKey.ts";
import { AttachedObjectType } from "./openapi/models/AttachedObjectType.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { SpanAnnotationRead } from "./openapi/models/SpanAnnotationRead.ts";
import { MemoService } from "./openapi/services/MemoService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

// MEMO QUERIES
const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
    staleTime: 1000 * 60 * 5,
  });

const useGetUserMemo = (attachedObjType: AttachedObjectType, attachedObjId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.USER_MEMO, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getUserMemoByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

const useGetOrCreateProjectUserMemo = (projectId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.USER_MEMO, AttachedObjectType.PROJECT, projectId],
    queryFn: () =>
      ProjectService.getOrCreateUserMemo({
        projId: projectId!,
      }),
    enabled: !!projectId,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

const useGetObjectMemos = (attachedObjType: AttachedObjectType, attachedObjId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.OBJECT_MEMOS, attachedObjType, attachedObjId],
    queryFn: () => MemoService.getMemosByAttachedObjectId({ attachedObjType, attachedObjId: attachedObjId! }),
    enabled: !!attachedObjId,
    retry: false,
  });

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationFn: MemoService.addMemo,
    onSuccess: (data) => {
      queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
      queryClient.setQueryData<MemoRead>(
        [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id],
        data,
      );
      queryClient.setQueryData<MemoRead[]>(
        [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
        (oldData) => (oldData ? [...oldData, data] : [data]),
      );
      switch (data.attached_object_type) {
        case AttachedObjectType.CODE:
          // add new memo id to the code's memo_ids
          queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, data.project_id], (oldData) => {
            if (oldData) {
              const code = oldData[data.attached_object_id];
              if (code) {
                const memoIds = code.memo_ids ? [...code.memo_ids, data.id] : [data.id];
                const newCode = { ...code, memo_ids: memoIds };
                return { ...oldData, [data.attached_object_id]: newCode };
              }
              return oldData;
            }
          });
          break;
        case AttachedObjectType.DOCUMENT_TAG:
          // add new memo id to the tags's memo_ids
          queryClient.setQueryData<DocumentTagRead[]>([QueryKey.PROJECT_TAGS, data.project_id], (oldData) => {
            if (oldData) {
              const tag = oldData.find((tag) => tag.id === data.attached_object_id);
              if (tag) {
                const memoIds = tag.memo_ids ? [...tag.memo_ids, data.id] : [data.id];
                const newTag = { ...tag, memo_ids: memoIds };
                return oldData.map((t) => (t.id === tag.id ? newTag : t));
              }
              return oldData;
            }
          });
          break;
        case AttachedObjectType.SPAN_ANNOTATION:
          // add new memo id to the span's memo_ids
          queryClient.setQueryData<SpanAnnotationRead>(
            [QueryKey.SPAN_ANNOTATION, data.attached_object_id],
            (oldData) => {
              if (oldData) {
                const memoIds = oldData.memo_ids ? [...oldData.memo_ids, data.id] : [data.id];
                const newSpan = { ...oldData, memo_ids: memoIds };
                return newSpan;
              }
              return oldData;
            },
          );
          break;
      }
    },
    meta: {
      successMessage: (memo: MemoRead) => `Created memo "${memo.title}"`,
    },
  });

const updateInvalidation = (data: MemoRead) => {
  queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
  queryClient.setQueryData<MemoRead>([QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id], data);
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
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memo: MemoRead) => `Updated memo "${memo.title}"`,
    },
  });

const useStarMemos = () =>
  useMutation({
    mutationFn: ({ memoIds, isStarred }: { memoIds: number[]; isStarred: boolean }) => {
      const promises = memoIds.map((memoId) => MemoService.updateById({ memoId, requestBody: { starred: isStarred } }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((memo) => {
        updateInvalidation(memo);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memos: MemoRead[], variables: { memoIds: number[]; isStarred: boolean }) =>
        `${variables.isStarred ? "Starred" : "Unstarred"} ${memos.length} memo(s)`,
    },
  });

const deleteInvalidation = (data: MemoRead) => {
  queryClient.removeQueries({ queryKey: [QueryKey.MEMO, data.id] });
  queryClient.removeQueries({ queryKey: [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id] });
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.filter((memo) => memo.id !== data.id) : oldData),
  );
};

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    onSuccess: (data) => {
      deleteInvalidation(data);
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
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
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_TABLE] });
    },
    meta: {
      successMessage: (memos: MemoRead[]) => `Deleted ${memos.length} memo(s)`,
    },
  });

const MemoHooks = {
  useGetMemo,
  useGetObjectMemos,
  useGetOrCreateProjectUserMemo,
  useGetUserMemo,
  useCreateMemo,
  useUpdateMemo,
  useStarMemos,
  useDeleteMemo,
  useDeleteMemos,
};

export default MemoHooks;
