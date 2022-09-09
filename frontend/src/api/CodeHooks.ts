import { useMutation, useQuery } from "@tanstack/react-query";
import { CodeRead, CodeService, MemoRead } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

// memo
const useCreateMemo = () =>
  useMutation(CodeService.addMemoCodeCodeIdMemoPut, {
    onSuccess: (createdMemo) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, createdMemo.user_id]);
    },
  });

const useGetMemos = (codeId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_CODE, codeId],
    () => CodeService.getMemosCodeCodeIdMemoGet({ codeId: codeId! }),
    {
      retry: false,
      enabled: !!codeId,
    }
  );

const useGetMemo = (codeId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_CODE, codeId, userId],
    () => CodeService.getUserMemoCodeCodeIdMemoUserIdGet({ codeId: codeId!, userId: userId! }),
    {
      retry: false,
      enabled: !!codeId && !!userId,
    }
  );

// code
const useGetCode = (codeId: number | undefined) =>
  useQuery<CodeRead, Error>([QueryKey.CODE, codeId], () => CodeService.getByIdCodeCodeIdGet({ codeId: codeId! }), {
    enabled: !!codeId,
  });

const useCreateCode = () =>
  useMutation(CodeService.createNewCodeCodePut, {
    onSuccess: (newCode, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, variables.requestBody.project_id]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, newCode.user_id]);
    },
  });

const useUpdateCode = () =>
  useMutation(CodeService.updateByIdCodeCodeIdPatch, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, data.project_id]);
    },
  });

const useDeleteCode = () =>
  useMutation(CodeService.deleteByIdCodeCodeIdDelete, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, data.project_id]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, data.user_id]);
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
