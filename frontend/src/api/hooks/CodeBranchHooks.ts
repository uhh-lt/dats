import { queryClient } from "@api/queryClient";
import { CodeBranchService } from "@api/services/CodeBranchService";
import { CodeBranchRead } from "@models/CodeBranchRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@store/storeHooks";
import { CodeHooks } from "./CodeHooks";
import { QueryKey } from "./QueryKey";

const useListBranches = (projectId: number | undefined, includeArchived = false) =>
  useQuery({
    queryKey: [QueryKey.CODE_BRANCHES, projectId, includeArchived],
    queryFn: () => {
      if (!projectId) throw new Error("A project is required to load code branches");
      return CodeBranchService.listBranches({ projectId, includeArchived });
    },
    enabled: Boolean(projectId),
  });

const useBranchChanges = (branchId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.CODE_BRANCH_CHANGES, branchId],
    queryFn: () => {
      if (!branchId) throw new Error("A branch is required to load changes");
      return CodeBranchService.listBranchChanges({ branchId });
    },
    enabled: Boolean(branchId),
  });

const useCodeOriginBranchLabel = (branchId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  const selectedBranchId = CodeHooks.useSelectedCodeBranchId();
  const branches = useListBranches(projectId, true);

  if (branchId === undefined || branchId === selectedBranchId) return undefined;
  if (branchId === null) return "Main";
  return branches.data?.find((branch) => branch.id === branchId)?.name ?? `Branch ${branchId}`;
};

const useCreateBranch = () =>
  useMutation({
    mutationFn: CodeBranchService.createBranch,
    onSuccess: (branch) => queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_BRANCHES, branch.project_id] }),
    meta: { successMessage: (branch: CodeBranchRead) => `Created branch ${branch.name}` },
  });

const invalidateBranchMutation = (branchId: number) => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_BRANCH_CHANGES, branchId] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CODES] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_SNAPSHOT] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_CHANGELOG] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_CONCEPTS] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_VERSION_SUMMARY] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_VERSIONS] });
};

const invalidatePromotedAnnotations = () => {
  queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATION] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATION] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.BBOX_ANNOTATIONS_USER_CODE] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
  queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEWS] });
};

const useMergeBranch = () =>
  useMutation({
    mutationFn: CodeBranchService.mergeBranch,
    onSuccess: (_data, variables) => {
      invalidateBranchMutation(variables.branchId);
      invalidatePromotedAnnotations();
    },
    onError: (_error, variables) => invalidateBranchMutation(variables.branchId),
    meta: { successMessage: "Merged code changes into Main" },
  });

const useResolveConflict = () =>
  useMutation({
    mutationFn: CodeBranchService.resolveConflict,
    onSuccess: (_data, variables) => invalidateBranchMutation(variables.branchId),
    meta: { successMessage: "Resolved code conflict" },
  });

const useArchiveBranch = () =>
  useMutation({
    mutationFn: CodeBranchService.archiveBranch,
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_BRANCHES, branch.project_id] });
      invalidateBranchMutation(branch.id);
    },
    meta: { successMessage: (branch: CodeBranchRead) => `Archived branch ${branch.name}` },
  });

export const CodeBranchHooks = {
  useListBranches,
  useBranchChanges,
  useCodeOriginBranchLabel,
  useCreateBranch,
  useMergeBranch,
  useResolveConflict,
  useArchiveBranch,
};
