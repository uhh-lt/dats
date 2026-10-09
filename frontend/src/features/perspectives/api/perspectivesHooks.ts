import { jobQueries, useJobRefetchInterval } from "@core/job";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { useAppSelector } from "@store/storeHooks";
import { useQuery } from "@tanstack/react-query";
import { AspectMap, perspectiveQueries } from "./perspectiveQueries";

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

export const useProjectAspectsQuery = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...perspectiveQueries.aspectsByProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

export const useGetAspect = (aspectId: number | null | undefined) =>
  useProjectAspectsQuery({
    select: (data) => data[aspectId!],
    enabled: !!aspectId,
  });

export const useGetAllAspectsList = () => useProjectAspectsQuery({ select: (data) => Object.values(data) });

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (visualization invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
export const useLivePerspectivesJob = (
  perspectivesJobId: string | null | undefined,
  initialData: PerspectivesJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<PerspectivesJobRead>();
  return useQuery({
    ...jobQueries.perspectives.byId(perspectivesJobId),
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};
