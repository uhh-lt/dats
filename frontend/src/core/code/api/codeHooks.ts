import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { CodeMap, codeQueries } from "./codeQueries";

// CODE QUERIES
// The query itself (key + queryFn) lives in codeQueries. The hooks below only derive data from it.

interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
}

export const useProjectCodesQuery = <T = CodeMap>({ select, enabled }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...codeQueries.byProject(projectId),
    select,
    enabled,
  });
};

export const useGetCode = (codeId: number | null | undefined) =>
  useProjectCodesQuery({
    select: (data) => data[codeId!],
    enabled: !!codeId,
  });

export const useSelectEnabledCodes = () => {
  return useCallback((data: CodeMap) => Object.values(data).filter((code) => code.enabled), []);
};

export const useGetAllCodesList = () => useProjectCodesQuery({ select: (data) => Object.values(data) });

export const useGetEnabledCodes = () => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useProjectCodesQuery({ select: selectEnabledCodes });
};
