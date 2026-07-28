import { queryClient } from "@api/queryClient";
import { CodeService } from "@api/services/CodeService";
import { addCodeParentIds, CodeReadWithParent } from "@core/code/codeTypes";
import { CodeRead } from "@models/CodeRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { QueryKey } from "./QueryKey";

export type CodeMap = Record<number, CodeReadWithParent>;

interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
  branchId?: number | null;
}

const useSelectedCodeBranchId = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useAppSelector((state) => (projectId ? state.project.codeBranchByProject[projectId] : null)) ?? null;
};

const useProjectCodesQuery = <T = CodeMap>({ select, enabled, branchId }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  const selectedBranchId = useSelectedCodeBranchId();
  const effectiveBranchId = branchId === undefined ? selectedBranchId : branchId;

  return useQuery({
    queryKey: [QueryKey.PROJECT_CODES, projectId, effectiveBranchId ?? "main"],
    queryFn: async () => {
      if (!projectId) throw new Error("A project is required to load codes");
      const codes = await CodeService.getByProject({
        projectId,
        branchId: effectiveBranchId,
      });
      codes.forEach((code) => queryClient.setQueryData([QueryKey.CODE_SNAPSHOT, code.id], code));
      return addCodeParentIds(codes).reduce<CodeMap>((acc, code) => {
        acc[code.id] = code;
        return acc;
      }, {});
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: Boolean(projectId) && (enabled ?? true),
  });
};

export const primeCodeSnapshots = async (projectId: number, codeIds: number[]) => {
  const missingIds = [...new Set(codeIds)].filter(
    (codeId) => queryClient.getQueryData([QueryKey.CODE_SNAPSHOT, codeId]) === undefined,
  );
  if (!missingIds.length) return;
  const snapshots = await CodeService.getSnapshots({ requestBody: { project_id: projectId, code_ids: missingIds } });
  snapshots.forEach((snapshot) => queryClient.setQueryData([QueryKey.CODE_SNAPSHOT, snapshot.id], snapshot));
};

const useGetCode = (codeId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.CODE_SNAPSHOT, codeId],
    queryFn: () => {
      if (!codeId) throw new Error("A code ID is required");
      return CodeService.getById({ codeId });
    },
    enabled: Boolean(codeId),
    staleTime: Number.POSITIVE_INFINITY,
  });

const useGetCodeSnapshots = (codeIds: number[]) =>
  useQueries({
    queries: [...new Set(codeIds)].map((codeId) => ({
      queryKey: [QueryKey.CODE_SNAPSHOT, codeId],
      queryFn: () => CodeService.getById({ codeId }),
      staleTime: Number.POSITIVE_INFINITY,
    })),
    combine: (results) => ({
      data: results.flatMap((result) => (result.data ? [result.data] : [])),
      isLoading: results.some((result) => result.isLoading),
    }),
  });

const useSelectEnabledCodes = () =>
  useCallback((data: CodeMap) => Object.values(data).filter((code) => code.enabled), []);

const useGetAllCodesList = (branchId?: number | null) =>
  useProjectCodesQuery({ select: (data) => Object.values(data), branchId });

const useGetAllCodesMap = (branchId?: number | null) => useProjectCodesQuery({ branchId });

const useGetEnabledCodes = (branchId?: number | null) => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useProjectCodesQuery({ select: selectEnabledCodes, branchId });
};

const invalidateCodeData = (projectId: number) => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES, projectId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_SNAPSHOT] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_BRANCH_CHANGES] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_HISTORY, projectId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_CHANGELOG, projectId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_CONCEPTS, projectId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_VERSION_SUMMARY, projectId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_VERSIONS, projectId] });
};

const useCreateCode = () =>
  useMutation({
    mutationFn: CodeService.createNewCode,
    onSuccess: (data) => invalidateCodeData(data.project_id),
    meta: { successMessage: (data: CodeRead) => `Created code ${data.name}` },
  });

const useUpdateCode = () => {
  const branchId = useSelectedCodeBranchId();
  return useMutation({
    mutationFn: (variables: Parameters<typeof CodeService.updateById>[0]) =>
      CodeService.updateById({
        ...variables,
        requestBody: {
          ...variables.requestBody,
          branch_id: variables.requestBody.branch_id ?? branchId,
        },
      }),
    onSuccess: (data) => {
      invalidateCodeData(data.project_id);
      queryClient.setQueryData([QueryKey.CODE_SNAPSHOT, data.id], data);
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, data.project_id] });
    },
    meta: { successMessage: (data: CodeRead) => `Updated code ${data.name}` },
  });
};

const useDeleteCode = () =>
  useMutation({
    mutationFn: CodeService.deleteById,
    onSuccess: (data) => {
      const first = data[0];
      if (!first) return;
      invalidateCodeData(first.project_id);
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_WHITEBOARDS, first.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, first.project_id] });
    },
    meta: { successMessage: () => "Deleted code" },
  });

const useGetHistory = (projectId: number, conceptId: string | undefined) =>
  useQuery({
    queryKey: [QueryKey.CODE_HISTORY, projectId, conceptId],
    queryFn: () => {
      if (!conceptId) throw new Error("A code concept is required");
      return CodeService.getHistory({ projectId, conceptId });
    },
    enabled: Boolean(projectId && conceptId),
  });

const useGetChangelog = (projectId: number, branchId: number | null, page: number, pageSize: number) =>
  useQuery({
    queryKey: [QueryKey.CODE_CHANGELOG, projectId, branchId ?? "main", page, pageSize],
    queryFn: () => CodeService.getChangelog({ projectId, branchId, page, pageSize }),
  });

const useFilterConcepts = (projectId: number | undefined, branchId: number | null) =>
  useQuery({
    queryKey: [QueryKey.CODE_FILTER_CONCEPTS, projectId, branchId ?? "main"],
    queryFn: () => {
      if (!projectId) throw new Error("A project is required to load code concepts");
      return CodeService.getFilterConcepts({ projectId, branchId });
    },
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
  });

const useFilterVersionSummary = (
  projectId: number | undefined,
  conceptId: string | undefined,
  branchId: number | null,
) =>
  useQuery({
    queryKey: [QueryKey.CODE_FILTER_VERSION_SUMMARY, projectId, branchId ?? "main", conceptId],
    queryFn: () => {
      if (!projectId || !conceptId) throw new Error("A project and code concept are required");
      return CodeService.getFilterVersionSummary({ projectId, conceptId, branchId });
    },
    enabled: Boolean(projectId && conceptId),
  });

const useFilterVersions = ({
  projectId,
  conceptId,
  branchId,
  query,
  page,
  pageSize,
  enabled,
}: {
  projectId: number | undefined;
  conceptId: string | undefined;
  branchId: number | null;
  query: string;
  page: number;
  pageSize: number;
  enabled: boolean;
}) =>
  useQuery({
    queryKey: [QueryKey.CODE_FILTER_VERSIONS, projectId, branchId ?? "main", conceptId, query, page, pageSize],
    queryFn: () => {
      if (!projectId || !conceptId) throw new Error("A project and code concept are required");
      return CodeService.getFilterVersions({
        projectId,
        conceptId,
        branchId,
        query: query || undefined,
        page,
        pageSize,
      });
    },
    enabled: enabled && Boolean(projectId && conceptId),
  });

export const CodeHooks = {
  useProjectCodesQuery,
  useGetAllCodesList,
  useGetAllCodesMap,
  useGetEnabledCodes,
  useGetCode,
  useGetCodeSnapshots,
  useGetHistory,
  useGetChangelog,
  useFilterConcepts,
  useFilterVersionSummary,
  useFilterVersions,
  useSelectedCodeBranchId,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};
