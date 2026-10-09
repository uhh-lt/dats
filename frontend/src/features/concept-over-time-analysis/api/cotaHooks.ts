import { jobQueries, useJobRefetchInterval } from "@core/job";
import { COTARefinementJobRead } from "@models/COTARefinementJobRead";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { cotaQueries } from "./cotaQueries";

export const useLiveCOTARefinementJob = (cotaRefinementJobId: string | null) => {
  const jobRefetchInterval = useJobRefetchInterval<COTARefinementJobRead>();
  return useQuery({
    ...jobQueries.cotaRefinement.byId(cotaRefinementJobId),
    refetchInterval: jobRefetchInterval,
  });
};

/**
 * Convenience hook for components that need a single COTA by ID but have no route context.
 * For route-backed components, use useSuspenseQuery with projectCotasQueryOptions directly.
 */
export const useGetCotaById = (cotaId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...cotaQueries.byProject(projectId!),
    select: (data) => (cotaId != null ? data[cotaId] : undefined),
    enabled: projectId !== undefined && cotaId != null,
  });
};

export const useGetProjectCotaList = () => {
  const projectId = useAppSelector((state) => state.project.projectId);

  return useQuery({
    ...cotaQueries.byProject(projectId!),
    select: (data) => Object.values(data),
    enabled: projectId !== undefined,
  });
};
