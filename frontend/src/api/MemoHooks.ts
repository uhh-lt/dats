import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { MemoRead, MemoService, MemoUpdate } from "./openapi";
import { QueryKey } from "./QueryKey";

const useGetMemo = (memoId: number | undefined) =>
  useQuery<MemoRead, Error>([QueryKey.MEMO, memoId], () => MemoService.getByIdMemoMemoIdGet({ memoId: memoId! }), {
    enabled: !!memoId,
  });

const useUpdateMemo = (options: UseMutationOptions<MemoRead, Error, { memoId: number; requestBody: MemoUpdate }>) =>
  useMutation(MemoService.updateByIdMemoMemoIdPatch, options);

const useDeleteMemo = (options: UseMutationOptions<MemoRead, Error, { memoId: number }>) =>
  useMutation(MemoService.deleteByIdMemoMemoIdDelete, options);

const MemoHooks = {
  useGetMemo,
  useUpdateMemo,
  useDeleteMemo,
};

export default MemoHooks;
