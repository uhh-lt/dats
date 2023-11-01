import { useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import {
  AnalysisConcept,
  AnalysisService,
  AnnotatedSegment,
  AnnotationOccurrence,
  CodeFrequency,
  CodeOccurrence,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  SpanAnnotationReadResolved,
  TimelineAnalysisResult,
} from "./openapi";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[]) =>
  useQuery<CodeFrequency[], Error>([QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds], () =>
    AnalysisService.codeFrequencies({
      projectId,
      requestBody: {
        user_ids: userIds,
        code_ids: codeIds,
      },
    }),
  );

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | undefined) =>
  useQuery<CodeOccurrence[], Error>(
    [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId],
    () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    {
      enabled: userIds.length > 0 && !!codeId,
    },
  );

const useAnnotationOccurrences = (projectId: number, userIds: number[], codeId: number | undefined) =>
  useQuery<AnnotationOccurrence[], Error>(
    [QueryKey.ANALYSIS_ANNOTATION_OCCURRENCES, projectId, userIds, codeId],
    () =>
      AnalysisService.annotationOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    {
      enabled: userIds.length > 0 && !!codeId,
    },
  );

const useTimelineAnalysis = (projectId: number, metadataKey: string, threshold: number, concepts: AnalysisConcept[]) =>
  useQuery<TimelineAnalysisResult[], Error>(
    [QueryKey.ANALYSIS_TIMELINE, projectId, metadataKey, threshold, concepts],
    () =>
      AnalysisService.timelineAnalysis({
        projectId,
        metadataKey,
        threshold,
        requestBody: concepts,
      }),
    {
      enabled: concepts.length > 0 && metadataKey.length > 0,
    },
  );

const useAnnotatedSegments = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<AnnotatedSegment[], Error>(
    [QueryKey.ANALYSIS_ANNOTATED_SEGMENTS, projectId, userId],
    () =>
      AnalysisService.annotatedSegments({
        projectId: projectId!,
        userId: userId!,
      }),
    {
      enabled: !!projectId && !!userId,
      onSuccess(data) {
        // convert to SpanAnnotationReadResolved
        const spanAnnotations: SpanAnnotationReadResolved[] = [];
        const codes: CodeRead[] = [];
        let tags: DocumentTagRead[] = [];
        const memos: MemoRead[] = [];

        data.forEach((segment) => {
          spanAnnotations.push(segment.annotation);
          codes.push(segment.annotation.code);
          tags = tags.concat(segment.tags);
          if (segment.memo) {
            memos.push(segment.memo);
          }
        });

        spanAnnotations.forEach((annotation) => {
          queryClient.setQueryData([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
        });
        codes.forEach((code) => {
          queryClient.setQueryData([QueryKey.CODE, code.id], code);
        });
        tags.forEach((tag) => {
          queryClient.setQueryData([QueryKey.TAG, tag.id], tag);
        });
        memos.forEach((memo) => {
          queryClient.setQueryData([QueryKey.MEMO, memo.id], memo);
        });
      },
    },
  );

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useTimelineAnalysis,
  useAnnotationOccurrences,
  useAnnotatedSegments,
};

export default AnalysisHooks;
