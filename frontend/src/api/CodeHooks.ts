import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { CodeService } from "./openapi/services/CodeService.ts";

// memo
const useGetUserMemo = (codeId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_CODE, codeId],
    queryFn: () => CodeService.getUserMemo({ codeId: codeId! }),
    retry: false,
    enabled: !!codeId,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, variables.requestBody.project_id] });
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
    },
  });

const CodeHooks = {
  useGetUserMemo,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};

export default CodeHooks;
