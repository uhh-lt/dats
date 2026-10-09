import { ConceptOverTimeAnalysisService } from "@api/services/ConceptOverTimeAnalysisService";
import type { COTARead } from "@models/COTARead";
import { queryOptions } from "@tanstack/react-query";

export type CotaMap = Record<number, COTARead>;

const fetchCotas = async (projectId: number) => {
  const data = await ConceptOverTimeAnalysisService.getByProject({ projectId });
  return data.reduce<CotaMap>((acc, cota) => {
    acc[cota.id] = cota;
    return acc;
  }, {});
};

/**
 * Query factory for concept-over-time analyses (COTA).
 *
 *   cotaQueries.all()                  ["cotas"]
 *   cotaQueries.byProject(projectId)   ["cotas", "project", projectId]
 *
 * The refinement job of a COTA is a background job, see jobQueries.cotaRefinement.
 */
export const cotaQueries = {
  all: () => ["cotas"] as const,

  // all COTAs of a project, as a map by id
  byProjectScope: () => [...cotaQueries.all(), "project"] as const,
  byProject: (projectId: number) =>
    queryOptions({
      queryKey: [...cotaQueries.byProjectScope(), projectId] as const,
      queryFn: () => fetchCotas(projectId),
      staleTime: 1000 * 60 * 5,
    }),
};
