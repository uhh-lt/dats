import { AnalysisService } from "@api/services/AnalysisService";
import { DocType } from "@models/DocType";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the code frequency analysis.
 *
 *   codeFrequencyQueries.all()          ["codeFrequency"]
 *   codeFrequencyQueries.frequencies()  ["codeFrequency", "frequencies", projectId, userIds, codeIds, docTypes]
 *   codeFrequencyQueries.occurrences()  ["codeFrequency", "occurrences", projectId, userIds, codeId, docTypes, children]
 */
export const codeFrequencyQueries = {
  all: () => ["codeFrequency"] as const,

  frequenciesScope: () => [...codeFrequencyQueries.all(), "frequencies"] as const,
  frequencies: (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
    queryOptions({
      queryKey: [...codeFrequencyQueries.frequenciesScope(), projectId, userIds, codeIds, docTypes] as const,
      queryFn: () =>
        AnalysisService.codeFrequencies({
          projectId,
          requestBody: { user_ids: userIds, code_ids: codeIds, doctypes: docTypes },
        }),
    }),

  occurrencesScope: () => [...codeFrequencyQueries.all(), "occurrences"] as const,
  occurrences: (
    projectId: number,
    userIds: number[],
    codeId: number | null | undefined,
    docTypes: DocType[],
    returnChildren: boolean,
  ) =>
    queryOptions({
      queryKey: [
        ...codeFrequencyQueries.occurrencesScope(),
        projectId,
        userIds,
        codeId,
        docTypes,
        returnChildren,
      ] as const,
      queryFn: !codeId
        ? skipToken
        : () =>
            AnalysisService.codeOccurrences({
              projectId,
              codeId,
              requestBody: { user_ids: userIds, doctypes: docTypes },
              returnChildren,
            }),
    }),
};
