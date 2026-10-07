import { jobQueries } from "@api/queries/jobQueries";
import { AspectMap, perspectiveQueries } from "@api/queries/perspectiveQueries";
import { queryClient } from "@api/queryClient";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { RagService } from "@api/services/RagService";
import { AspectRead } from "@models/AspectRead";
import { ClusterRead } from "@models/ClusterRead";
import { CodeRead } from "@models/CodeRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useJobRefetchInterval } from "./jobPolling";

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

const useProjectAspectsQuery = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...perspectiveQueries.aspectsByProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

const useGetAspect = (aspectId: number | null | undefined) =>
  useProjectAspectsQuery({
    select: (data) => data[aspectId!],
    enabled: !!aspectId,
  });

const useGetAllAspectsList = () => useProjectAspectsQuery({ select: (data) => Object.values(data) });

const useCreateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "createAspect"],
    mutationFn: PerspectivesService.createAspect,
    meta: {
      datsEvent: "ASPECT_CREATED",
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

const useUpdateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "updateAspect"],
    mutationFn: PerspectivesService.updateAspectById,
    meta: {
      datsEvent: "ASPECT_UPDATED",
      successMessage: (data: CodeRead) => `Updated aspect ${data.name}`,
    },
  });

const useDeleteAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "deleteAspect"],
    mutationFn: PerspectivesService.removeAspectById,
    meta: {
      datsEvent: "ASPECT_DELETED",
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

const useStartPerspectivesJob = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "startPerspectivesJob"],
    mutationFn: PerspectivesService.startPerspectivesJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: perspectiveQueries.aspectsByProject(job.project_id).queryKey });
      queryClient.invalidateQueries({ queryKey: jobQueries.perspectives.byId(job.job_id).queryKey });
    },
    meta: {
      successMessage: (data: PerspectivesJobRead) => `Started TM Job as a new background task (ID: ${data.job_id})`,
    },
  });

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (visualization invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const useLivePerspectivesJob = (
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

const useUpdateClusterDetails = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "updateClusterDetails"],
    mutationFn: PerspectivesService.updateClusterDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: perspectiveQueries.visualizationOfAspectScope(data.aspect_id) });
    },
    meta: {
      successMessage: (data: ClusterRead) => `Updated cluster ${data.name}`,
    },
  });

const useRAGChat = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "rAGChat"],
    mutationFn: RagService.ragSession,
  });

export const PerspectivesHooks = {
  useGetAllAspectsList,
  useGetAspect,
  useCreateAspect,
  useUpdateAspect,
  useDeleteAspect,
  useStartPerspectivesJob,
  useLivePerspectivesJob,
  useUpdateClusterDetails,
  useRAGChat,
};
