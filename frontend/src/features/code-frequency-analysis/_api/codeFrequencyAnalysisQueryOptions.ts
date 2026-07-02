import { QueryKey } from "@api/hooks/QueryKey";
import { AnalysisService } from "@api/services/AnalysisService";
import { CodeFrequency } from "@models/CodeFrequency";
import { CodeOccurrence } from "@models/CodeOccurrence";
import { DocType } from "@models/DocType";
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
