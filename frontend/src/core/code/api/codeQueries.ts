import { CodeService } from "@api/services/CodeService";
import type { CodeRead } from "@models/CodeRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type CodeMap = Record<number, CodeRead>;

/**
 * Query factory for codes.
 *
 *   codeQueries.all()                    ["code"]
 *   codeQueries.projectScope(projectId)  ["code", "project", projectId]
 *   codeQueries.byProject(projectId)     ["code", "project", projectId]
 */
export const codeQueries = {
  all: () => ["code"] as const,
  // prefix of all code queries of one project
  projectScope: (projectId: number | null | undefined) => [...codeQueries.all(), "project", projectId] as const,

  // all codes of a project, as a map by code id
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: codeQueries.projectScope(projectId),
      queryFn:
        projectId === undefined
          ? skipToken
          : async () => {
              const codes = await CodeService.getByProject({ projectId });
              return codes.reduce<CodeMap>((acc, code) => {
                acc[code.id] = code;
                return acc;
              }, {});
            },
      staleTime: 1000 * 60 * 5,
    }),
};
