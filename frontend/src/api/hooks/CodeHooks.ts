import { CodeService } from "@api/services/CodeService";
import { CodeRead } from "@models/CodeRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { QueryKey } from "./QueryKey";

// CODE QUERIES

export type CodeMap = Record<number, CodeRead>;
interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
}

const useProjectCodesQuery = <T = CodeMap>({ select, enabled }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_CODES, projectId],
    queryFn: async () => {
      const codes = await CodeService.getByProject({
        projId: projectId!,
      });
      return codes.reduce((acc, code) => {
        acc[code.id] = code;
        return acc;
      }, {} as CodeMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const useGetCode = (codeId: number | null | undefined) =>
  useProjectCodesQuery({
    select: (data) => data[codeId!],
    enabled: !!codeId,
  });

const useSelectEnabledCodes = () => {
  return useCallback((data: CodeMap) => Object.values(data).filter((code) => code.enabled), []);
};

const useGetAllCodesList = () => useProjectCodesQuery({ select: (data) => Object.values(data) });

const useGetAllCodesMap = () => useProjectCodesQuery({});

const useGetEnabledCodes = () => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useProjectCodesQuery({ select: selectEnabledCodes });
};

// CODE MUTATIONS
const useCreateCode = () => {
  return useMutation({
    mutationFn: CodeService.createCode,
    meta: {
      datsEvent: "CODE_CREATED",
      successMessage: (data: CodeRead) => `Created code ${data.name}`,
    },
  });
};

const useUpdateCode = () =>
  useMutation({
    mutationFn: CodeService.updateById,
    meta: {
      datsEvent: "CODE_UPDATED",
      successMessage: (data: CodeRead) => `Updated code ${data.name}`,
    },
  });

const useDeleteCode = () => {
  return useMutation({
    mutationFn: CodeService.deleteById,
    meta: {
      datsEvent: "CODE_DELETED",
      successMessage: (data: CodeRead) => `Deleted code ${data.name}`,
    },
  });
};

export const CodeHooks = {
  // codes
  useGetAllCodesList,
  useGetAllCodesMap,
  useGetEnabledCodes,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};
