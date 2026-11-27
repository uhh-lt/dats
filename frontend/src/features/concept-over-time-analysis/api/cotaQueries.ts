import { JobService } from "@api/services/JobService";
import { createJobQueries } from "@core/job";
import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import type { ConceptOverTimeAnalysisRead } from "@models/ConceptOverTimeAnalysisRead";
import { queryOptions } from "@tanstack/react-query";

export type CotaMap = Record<number, ConceptOverTimeAnalysisRead>;

/**
 * Query factory for concept-over-time analyses (COTA).
 *
 *   cotaQueries.all()                     ["cota"]
 *   cotaQueries.projectScope(projectId)   ["cota", "project", projectId]
 *   cotaQueries.byProject(projectId)      ["cota", "project", projectId]
 *
 * The refinement job of a COTA is a background job, `cotaQueries.job`.
 */
export const cotaQueries = {
  all: () => ["cota"] as const,
  // prefix of all COTA queries of one project
  projectScope: (projectId: number) => [...cotaQueries.all(), "project", projectId] as const,

  // all COTAs of a project, as a map by id
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: cotaQueries.projectScope(projectId),
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
  job: createJobQueries("cota", (job) => JobService.getCotaRefinementJobById(job)),
};
