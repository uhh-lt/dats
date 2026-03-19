import { QueryKey } from "@api/hooks/QueryKey";
import { CodeFrequency } from "@api/models/CodeFrequency";
import { CodeOccurrence } from "@api/models/CodeOccurrence";
import { DocType } from "@api/models/DocType";
import { AnalysisService } from "@api/services/AnalysisService";
import { useQuery } from "@tanstack/react-query";

export const useCodeFrequenciesQuery = (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
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

export const useCodeOccurrencesQuery = (
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
