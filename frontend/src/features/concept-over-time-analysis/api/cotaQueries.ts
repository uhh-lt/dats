import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import type { COTARead } from "@models/COTARead";
import { queryOptions, skipToken } from "@tanstack/react-query";

export type CotaMap = Record<number, COTARead>;

const cotaRefinementJobQueries = {
  all: () => [...cotaQueries.all(), "job"] as const,
  byId: (jobId: string | null | undefined) =>
    queryOptions({
      queryKey: [...cotaRefinementJobQueries.all(), "detail", jobId] as const,
      queryFn: !jobId ? skipToken : () => ConceptOverTimeAnalysisService.getCotaJob({ cotaJobId: jobId }),
    }),
};

/**
 * Query factory for concept-over-time analyses (COTA).
 *
 *   cotaQueries.all()                  ["cota"]
 *   cotaQueries.byProject(projectId)   ["cota", "project", projectId]
 *
 * The refinement job of a COTA is a background job, `cotaQueries.job`.
 */
export const cotaQueries = {
  all: () => ["cota"] as const,

  // all COTAs of a project, as a map by id
  byProjectScope: () => [...cotaQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...cotaQueries.byProjectScope(), projectId] as const,
      queryFn: async () => {
        const data = await ConceptOverTimeAnalysisService.getByProject({ projectId });
        return data.reduce<CotaMap>((acc, cota) => {
          acc[cota.id] = cota;
          return acc;
        }, {});
      },
      staleTime: 1000 * 60 * 5,
    }),

  // the refinement / background job of this domain
  job: cotaRefinementJobQueries,
};
