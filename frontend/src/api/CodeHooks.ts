import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { AnnoActions } from "../features/annotation/annoSlice.ts";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { useAppDispatch, useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { CodeService } from "./openapi/services/CodeService.ts";

// CODE QUERIES

export type CodeMap = Record<number, CodeRead>;
interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
}

const useProjectCodesQuery = <T = CodeMap>({ select, enabled }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
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
    enabled: !!projectId && enabled,
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
    mutationFn: CodeService.createNewCode,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, variables.requestBody.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (data: CodeRead) => `Created code ${data.name}`,
    },
  });
};

const useUpdateCode = () =>
  useMutation({
    mutationFn: CodeService.updateById,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, data.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
      // if the user changed the enabled status, refetch all codes
      if (!(variables.requestBody.enabled === undefined || variables.requestBody.enabled === null)) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, data.project_id] });
      }
    },
    meta: {
      successMessage: (data: CodeRead) => `Updated code ${data.name}`,
    },
  });

const useDeleteCode = () => {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: CodeService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, data.project_id], (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        delete newData[data.id];
        return newData;
      });
      // reset global server state: invalidate everything that could be affected by a code
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_ENTITY_STATISTICS, data.id] });
      // reset global client state
      dispatch(AnnoActions.onDeleteCode(data.id));
    },
    meta: {
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
