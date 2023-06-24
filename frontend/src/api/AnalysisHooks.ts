import { useQuery } from "@tanstack/react-query";
import { AnalysisService, CodeFrequency, CodeOccurrence } from "./openapi";
import { QueryKey } from "./QueryKey";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[]) =>
  useQuery<CodeFrequency[], Error>([QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds], () =>
    AnalysisService.codeFrequencies({
      projectId,
      requestBody: {
        user_ids: userIds,
        code_ids: codeIds,
      },
    })
  );

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number) =>
  useQuery<CodeOccurrence[], Error>([QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId], () =>
    AnalysisService.codeOccurrences({
      projectId,
      codeId,
      requestBody: userIds,
    })
  );

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
};

export default AnalysisHooks;
