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
  DBColumns,
  DocumentTagRead,
  Filter,
  IDOperator,
  LogicalOperator,
  MemoRead,
  SpanAnnotationReadResolved,
  TimelineAnalysisResult,
} from "./openapi";
import { useDebounce } from "../utils/useDebounce";
import { useEffect } from "react";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[]) =>
  useQuery<CodeFrequency[], Error>([QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds], () =>
    AnalysisService.codeFrequencies({
      projectId,
      requestBody: {
        filter: {
          items: [
            {
              column: DBColumns.CODE_ID,
              operator: IDOperator.ID_EQUALS,
              value: 1,
            },
          ],
          logic_operator: LogicalOperator.AND,
        },
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

const useAnnotatedSegments = (projectId: number | undefined, userId: number | undefined, filter: Filter) => {
  const debouncedFilter = useDebounce(filter, 1000);
  return useQuery<Record<number, AnnotatedSegment>, Error>(
    [QueryKey.ANALYSIS_ANNOTATED_SEGMENTS, projectId, userId, debouncedFilter],
    async () => {
      const annotatedSegments = await AnalysisService.annotatedSegments({
        projectId: projectId!,
        userId: userId!,
        requestBody: debouncedFilter,
      });

      return annotatedSegments.reduce((previousValue, currentValue) => {
        return {
          ...previousValue,
          [currentValue.annotation.id]: currentValue,
        };
      }, {});
    },
    {
      enabled: !!projectId && !!userId,
      onSuccess(data) {
        const annotatedSegments = Object.values(data);

        // convert to SpanAnnotationReadResolved
        const spanAnnotations: SpanAnnotationReadResolved[] = [];
        const codes: CodeRead[] = [];
        let tags: DocumentTagRead[] = [];
        const memos: MemoRead[] = [];

        annotatedSegments.forEach((segment) => {
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
};

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useTimelineAnalysis,
  useAnnotationOccurrences,
  useAnnotatedSegments,
};

export default AnalysisHooks;
