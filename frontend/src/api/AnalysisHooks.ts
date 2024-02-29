import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { AnnotationOccurrence } from "./openapi/models/AnnotationOccurrence.ts";
import { CodeFrequency } from "./openapi/models/CodeFrequency.ts";
import { CodeOccurrence } from "./openapi/models/CodeOccurrence.ts";
import { AnalysisService } from "./openapi/services/AnalysisService.ts";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[]) =>
  useQuery<CodeFrequency[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds],
    queryFn: () =>
      AnalysisService.codeFrequencies({
        projectId,
        requestBody: {
          user_ids: userIds,
          code_ids: codeIds,
        },
      }),
  });

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
  useQuery<CodeOccurrence[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId],
    queryFn: () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    enabled: userIds.length > 0 && !!codeId,
  });

const useAnnotationOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
  useQuery<AnnotationOccurrence[], Error>({
    queryKey: [QueryKey.ANALYSIS_ANNOTATION_OCCURRENCES, projectId, userIds, codeId],
    queryFn: () =>
      AnalysisService.annotationOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    enabled: userIds.length > 0 && !!codeId,
  });

const useSampleSdocsByTags = () => useMutation(AnalysisService.sampleSdocsByTags);

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useAnnotationOccurrences,
  useSampleSdocsByTags,
};

export default AnalysisHooks;
