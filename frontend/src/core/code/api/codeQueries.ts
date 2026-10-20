import { CodeService } from "@api/services/CodeService";
import type { CodeRead } from "@models/CodeRead";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type CodeMap = Record<number, CodeRead>;

/**
 * Query factory for codes. Keys are hierarchical: domain -> scope -> params.
 *
 *   codeQueries.all()                 ["code"]
 *   codeQueries.byProject(projectId)  ["code", "project", projectId]
 */
export const codeQueries = {
  all: () => ["code"] as const,

  // all codes of a project, as a map by code id
  byProject: (projectId: number | undefined) =>
    queryOptions({
      queryKey: [...codeQueries.all(), "project", projectId] as const,
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
