import { queryClient } from "@api/queryClient";
import { AnnotationDashboardService } from "@api/services/AnnotationDashboardService";
import { AnnotationReviewService } from "@api/services/AnnotationReviewService";
import { AnnotationReviewType } from "@models/AnnotationReviewType";
import { AnnotationReviewAction } from "@models/AnnotationReviewAction";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

const useReviewCounts = (projectId: number | undefined, branchId?: number | null, codeId?: number) =>
  useQuery({
    queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, projectId, branchId ?? "main", codeId ?? "all"],
    queryFn: () => {
      if (!projectId) throw new Error("A project is required to load review counts");
      return AnnotationReviewService.getReviewCounts({ projectId, branchId, codeId });
    },
    enabled: Boolean(projectId),
  });

const useReviews = ({
  projectId,
  annotationType,
  page,
  pageSize,
  userId,
  branchId,
  codeId,
}: {
  projectId: number;
  annotationType: AnnotationReviewType;
  page: number;
  pageSize: number;
  userId?: number;
  branchId?: number | null;
  codeId?: number;
}) =>
  useQuery({
    queryKey: [
      QueryKey.ANNOTATION_REVIEWS,
      projectId,
      branchId ?? "main",
      codeId ?? "all",
      annotationType,
      page,
      pageSize,
      userId ?? "all",
    ],
    queryFn: () =>
      AnnotationReviewService.listReviews({ projectId, annotationType, page, pageSize, userId, branchId, codeId }),
  });

const useResolveReview = () =>
  useMutation({
    mutationFn: AnnotationReviewService.resolveReview,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEWS, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.RECENT_ANNOTATED_DOCUMENTS, variables.projectId] });
    },
    meta: { successMessage: "Resolved annotation review" },
  });

const useResolveReviewsBulk = () =>
  useMutation({
    mutationFn: ({
      projectId,
      branchId,
      sourceCodeIds,
      action,
      replacementCodeId,
    }: {
      projectId: number;
      branchId: number | null;
      sourceCodeIds: number[];
      action: AnnotationReviewAction;
      replacementCodeId?: number;
    }) =>
      Promise.all(
        sourceCodeIds.map((sourceCodeId) =>
          AnnotationReviewService.resolveReviewsBulk({
            projectId,
            branchId,
            requestBody: {
              source_code_id: sourceCodeId,
              action,
              replacement_code_id: replacementCodeId,
            },
          }),
        ),
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEWS, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_BBOX_ANNOTATIONS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR] });
    },
    meta: { successMessage: "Resolved affected annotations" },
  });

const useReviewCountsForCodes = (
  projectId: number | undefined,
  branchId: number | null | undefined,
  codeIds: number[],
) =>
  useQueries({
    queries: [...new Set(codeIds)].map((codeId) => ({
      queryKey: [QueryKey.ANNOTATION_REVIEW_COUNTS, projectId, branchId ?? "main", codeId],
      queryFn: () => {
        if (!projectId) throw new Error("A project is required to load review counts");
        return AnnotationReviewService.getReviewCounts({ projectId, branchId, codeId });
      },
      enabled: Boolean(projectId),
    })),
    combine: (results) => ({
      data: results.reduce(
        (counts, result) => ({
          span: counts.span + (result.data?.span ?? 0),
          sentence: counts.sentence + (result.data?.sentence ?? 0),
          bbox: counts.bbox + (result.data?.bbox ?? 0),
        }),
        { span: 0, sentence: 0, bbox: 0 },
      ),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
    }),
  });

const useRecentDocuments = (projectId: number | undefined, limit = 10) =>
  useQuery({
    queryKey: [QueryKey.RECENT_ANNOTATED_DOCUMENTS, projectId, limit],
    queryFn: () => {
      if (!projectId) throw new Error("A project is required to load recent documents");
      return AnnotationDashboardService.getRecentDocuments({ projectId, limit });
    },
    enabled: Boolean(projectId),
  });

export const AnnotationGovernanceHooks = {
  useReviewCounts,
  useReviews,
  useResolveReview,
  useResolveReviewsBulk,
  useReviewCountsForCodes,
  useRecentDocuments,
};
