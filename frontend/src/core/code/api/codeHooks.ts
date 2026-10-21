import { CodeService } from "@api/services/CodeService";
import { CodeRead } from "@models/CodeRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CodeMap, codeQueries } from "./codeQueries";

// CODE QUERIES
// The query itself (key + queryFn) lives in codeQueries. The hooks below only derive data from it.

interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
}

const useGetAllCodesMap = <T = CodeMap>({ select, enabled }: UseProjectCodesQueryParams<T> = {}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...codeQueries.byProject(projectId),
    select,
    enabled,
  });
};

const useGetCode = (codeId: number | null | undefined) =>
  useGetAllCodesMap({
    select: (data) => data[codeId!],
    enabled: !!codeId,
  });

const selectEnabledCodes = (data: CodeMap) => Object.values(data).filter((code) => code.enabled);

const useGetAllCodes = () => useGetAllCodesMap({ select: (data) => Object.values(data) });

const useGetEnabledCodes = () => useGetAllCodesMap({ select: selectEnabledCodes });

// CODE MUTATIONS
const useCreateCode = () => {
  return useMutation({
    mutationKey: [...codeQueries.all(), "createCode"],
    mutationFn: CodeService.createCode,
    meta: {
      datsEvent: "CODE_CREATED",
      successMessage: (data: CodeRead) => `Created code ${data.name}`,
    },
  });
};

const useUpdateCode = () =>
  useMutation({
    mutationKey: [...codeQueries.all(), "updateCode"],
    mutationFn: CodeService.updateById,
    meta: {
      datsEvent: "CODE_UPDATED",
      successMessage: (data: CodeRead) => `Updated code ${data.name}`,
    },
  });

const useDeleteCode = () => {
  return useMutation({
    mutationKey: [...codeQueries.all(), "deleteCode"],
    mutationFn: CodeService.deleteById,
    meta: {
      datsEvent: "CODE_DELETED",
      successMessage: (data: CodeRead) => `Deleted code ${data.name}`,
    },
  });
};

export const CodeHooks = {
  useGetAllCodesMap,
  useGetCode,
  useGetAllCodes,
  useGetEnabledCodes,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};
