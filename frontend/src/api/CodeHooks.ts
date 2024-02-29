import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { CodeService } from "./openapi/services/CodeService.ts";

// memo
const useCreateMemo = () =>
  useMutation({
    mutationFn: CodeService.addMemo,
    onSuccess: (createdMemo) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_MEMOS, createdMemo.user_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.MEMO_CODE, createdMemo.attached_object_id, createdMemo.user_id],
      });
    },
  });

const useGetMemos = (codeId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.MEMO_CODE, codeId],
    queryFn: () => CodeService.getMemos({ codeId: codeId! }),
    retry: false,
    enabled: !!codeId,
  });

const useGetMemo = (codeId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_CODE, codeId, userId],
    queryFn: () => CodeService.getUserMemo({ codeId: codeId!, userId: userId! }),
    retry: false,
    enabled: !!codeId && !!userId,
  });

// code
const useGetCode = (codeId: number | null | undefined) =>
  useQuery<CodeRead, Error>({
    queryKey: [QueryKey.CODE, codeId],
    queryFn: () => CodeService.getById({ codeId: codeId! }),
    enabled: !!codeId,
  });

const useCreateCode = () =>
  useMutation({
    mutationFn: CodeService.createNewCode,
    onSuccess: (newCode, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, variables.requestBody.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_CODES, newCode.user_id] });
    },
  });

const useUpdateCode = () =>
  useMutation({
    mutationFn: CodeService.updateById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.CODE, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, data.project_id] });
    },
  });

const useDeleteCode = () =>
  useMutation({
    mutationFn: CodeService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.CODE, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_CODES, data.user_id] });
    },
  });

const CodeHooks = {
  useCreateMemo,
  useGetMemo,
  useGetMemos,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};

export default CodeHooks;
