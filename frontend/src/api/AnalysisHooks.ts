import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";
import { AnalysisService, AnnotationOccurrence, CodeFrequency, CodeOccurrence } from "./openapi";

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

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
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

const useAnnotationOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
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

const useSampleSdocsByTags = () => useMutation(AnalysisService.sampleSdocsByTags);

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useAnnotationOccurrences,
  useSampleSdocsByTags,
};

export default AnalysisHooks;
