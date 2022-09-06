import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { CodeCreate, CodeRead, CodeService, CodeUpdate, MemoCreate, MemoRead } from "./openapi";
import { QueryKey } from "./QueryKey";

// memo
const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { codeId: number; requestBody: MemoCreate }>) =>
  useMutation(CodeService.addMemoCodeCodeIdMemoPut, options);

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

const useCreateCode = (options: UseMutationOptions<CodeRead, Error, { requestBody: CodeCreate }>) =>
  useMutation(CodeService.createNewCodeCodePut, options);

const useUpdateCode = (options: UseMutationOptions<CodeRead, Error, { codeId: number; requestBody: CodeUpdate }>) =>
  useMutation(CodeService.updateByIdCodeCodeIdPatch, options);

const useDeleteCode = (options: UseMutationOptions<CodeRead, Error, { codeId: number }>) =>
  useMutation(CodeService.deleteByIdCodeCodeIdDelete, options);

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
