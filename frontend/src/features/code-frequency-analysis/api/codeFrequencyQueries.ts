import { CodeFrequenciesService } from "@api/services/CodeFrequenciesService";
import { DocType } from "@models/DocType";
import { queryOptions, skipToken } from "@tanstack/react-query";

/**
 * Query factory for the code frequency analysis.
 *
 *   codeFrequencyQueries.all()                     ["codeFrequency"]
 *   codeFrequencyQueries.projectScope(projectId)   ["codeFrequency", "project", projectId]
 *   codeFrequencyQueries.frequencies(projectId, ...)  ["codeFrequency", "project", projectId, "frequencies", userIds, codeIds, docTypes]
 *   codeFrequencyQueries.occurrences(projectId, ...)  ["codeFrequency", "project", projectId, "occurrences", userIds, codeId, docTypes, children]
 */
export const codeFrequencyQueries = {
  all: () => ["codeFrequency"] as const,
  // prefix of all code frequency queries of one project
  projectScope: (projectId: number) => [...codeFrequencyQueries.all(), "project", projectId] as const,

  frequenciesScope: (projectId: number) => [...codeFrequencyQueries.projectScope(projectId), "frequencies"] as const,
  frequencies: (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
    queryOptions({
      queryKey: [...codeFrequencyQueries.frequenciesScope(projectId), userIds, codeIds, docTypes] as const,
      queryFn: () =>
        CodeFrequenciesService.computeCodeFrequencies({
          projectId,
          requestBody: { user_ids: userIds, code_ids: codeIds, doctypes: docTypes },
        }),
    }),

  occurrencesScope: (projectId: number) => [...codeFrequencyQueries.projectScope(projectId), "occurrences"] as const,
  occurrences: (
    projectId: number,
    userIds: number[],
    codeId: number | null | undefined,
    docTypes: DocType[],
    returnChildren: boolean,
  ) =>
    queryOptions({
      queryKey: [
        ...codeFrequencyQueries.occurrencesScope(projectId),
        userIds,
        codeId,
        docTypes,
        returnChildren,
      ] as const,
      queryFn: !codeId
        ? skipToken
        : () =>
            CodeFrequenciesService.computeCodeOccurrences({
              projectId,
              requestBody: { code_id: codeId, return_children: returnChildren, user_ids: userIds, doctypes: docTypes },
            }),
    }),
};
