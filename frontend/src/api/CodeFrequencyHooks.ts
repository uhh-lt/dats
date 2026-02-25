import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";
import { CodeFrequency } from "./openapi/models/CodeFrequency";
import { CodeOccurrence } from "./openapi/models/CodeOccurrence";
import { DocType } from "./openapi/models/DocType";
import { AnalysisService } from "./openapi/services/AnalysisService";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
  useQuery<CodeFrequency[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds, docTypes],
    queryFn: () =>
      AnalysisService.codeFrequencies({
        projectId,
        requestBody: {
          user_ids: userIds,
          code_ids: codeIds,
          doctypes: docTypes,
        },
      }),
  });

const useCodeOccurrences = (
  projectId: number,
  userIds: number[],
  codeId: number | null | undefined,
  returnChildren: boolean,
) =>
  useQuery<CodeOccurrence[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId, returnChildren],
    queryFn: () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
        returnChildren,
      }),
    enabled: userIds.length > 0 && !!codeId,
  });

export const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
};
