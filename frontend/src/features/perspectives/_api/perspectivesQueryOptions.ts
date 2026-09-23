import { QueryKey } from "@api/hooks/QueryKey";
import { useJobRefetchInterval } from "@api/hooks/jobPolling";
import { queryClient } from "@api/queryClient";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { RagService } from "@api/services/RagService";
import { AspectRead } from "@models/AspectRead";
import { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import { ClusterRead } from "@models/ClusterRead";
import { CodeRead } from "@models/CodeRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export type AspectMap = Record<number, AspectRead>;

export const projectAspectsQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_ASPECTS, projectId],
    queryFn: async () => {
      const aspects = await PerspectivesService.getAllAspects({
        projId: projectId,
      });
      return aspects.reduce((acc, aspect) => {
        acc[aspect.id] = aspect;
        return acc;
      }, {} as AspectMap);
    },
    staleTime: 1000 * 60 * 5,
  });

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

const useProjectAspectsQuery = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...projectAspectsQueryOptions(projectId!),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const useGetAspect = (aspectId: number | null | undefined) =>
  useProjectAspectsQuery({
    select: (data) => data[aspectId!],
    enabled: !!aspectId,
  });

const useGetAllAspectsList = () => useProjectAspectsQuery({ select: (data) => Object.values(data) });

const useGetDocumentAspect = (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
  useQuery<string, Error>({
    queryKey: [QueryKey.SDOC_ASPECT_CONTENT, aspectId, sdocId],
    queryFn: () => PerspectivesService.getDocaspectById({ aspectId: aspectId!, sdocId: sdocId! }),
    enabled: !!aspectId && !!sdocId,
    staleTime: Infinity,
  });

const useCreateAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.createAspect,
    meta: {
      entityEvent: "ASPECT_CREATED",
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

const useUpdateAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.updateAspectById,
    meta: {
      entityEvent: "ASPECT_UPDATED",
      successMessage: (data: CodeRead) => `Updated aspect ${data.name}`,
    },
  });

const useDeleteAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.removeAspectById,
    meta: {
      entityEvent: "ASPECT_DELETED",
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

const useStartPerspectivesJob = () =>
  useMutation({
    mutationFn: PerspectivesService.startPerspectivesJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ASPECTS, job.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PERSPECTIVES_JOB, job.job_id] });
    },
    meta: {
      successMessage: (data: PerspectivesJobRead) => `Started TM Job as a new background task (ID: ${data.job_id})`,
    },
  });

// Job updates arrive via websocket (JOB_UPDATED); the completion side-effects
// (visualization invalidations) live in the JOB_UPDATED handler in
// frontend/src/plugins/websocket/websocketEventHandlers.ts.
const usePollPerspectivesJob = (
  perspectivesJobId: string | null | undefined,
  initialData: PerspectivesJobRead | undefined,
) => {
  const jobRefetchInterval = useJobRefetchInterval<PerspectivesJobRead>();
  return useQuery<PerspectivesJobRead, Error>({
    queryKey: [QueryKey.PERSPECTIVES_JOB, perspectivesJobId],
    queryFn: () =>
      PerspectivesService.getPerspectivesJob({
        perspectivesJobId: perspectivesJobId!,
      }),
    enabled: !!perspectivesJobId,
    refetchInterval: jobRefetchInterval,
    initialData,
  });
};

const useLabelDocs = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.acceptLabel({
        aspectId,
        searchQuery,
        requestBody: {
          sdoc_ids: sdocIds,
          filter: filter as Body_perspectives_visualize_documents["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKey.DOCUMENT_VISUALIZATION, aspectId, searchQuery, filter], data);
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Accepted cluster(s) for ${data.docs.length} documents`,
    },
  });
};

const useUnlabelDocs = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.revertLabel({
        aspectId,
        searchQuery,
        requestBody: {
          sdoc_ids: sdocIds,
          filter: filter as Body_perspectives_visualize_documents["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKey.DOCUMENT_VISUALIZATION, aspectId, searchQuery, filter], data);
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Reverted cluster(s) for ${data.docs.length} documents`,
    },
  });
};

const useGetDocVisualization = (
  aspectId: number,
  searchQuery: string,
  filter: Body_perspectives_visualize_documents["filter"],
) =>
  useQuery({
    queryKey: [QueryKey.DOCUMENT_VISUALIZATION, aspectId, searchQuery, filter],
    queryFn: () =>
      PerspectivesService.visualizeDocuments({
        aspectId,
        searchQuery,
        requestBody: {
          filter,
          sorts: [],
        },
      }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });

const useGetClusterSimilarities = (aspectId: number) =>
  useQuery({
    queryKey: [QueryKey.CLUSTER_SIMILARITIES, aspectId],
    queryFn: () =>
      PerspectivesService.getClusterSimilarities({
        aspectId,
      }),
    staleTime: 1000 * 60 * 5,
  });

const useUpdateClusterDetails = () =>
  useMutation({
    mutationFn: PerspectivesService.updateClusterDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, data.aspect_id] });
    },
    meta: {
      successMessage: (data: ClusterRead) => `Updated cluster ${data.name}`,
    },
  });

const useGetClustersBySdocId = (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.SDOC_CLUSTES, aspectId, sdocId],
    queryFn: () => PerspectivesService.getClustersForSdoc({ aspectId: aspectId!, sdocId: sdocId! }),
    enabled: !!aspectId && !!sdocId,
    staleTime: 1000 * 60 * 5,
  });

const useRAGChat = () =>
  useMutation({
    mutationFn: RagService.ragSession,
  });

export const PerspectivesQueryOptions = {
  useGetAllAspectsList,
  useGetAspect,
  useGetDocumentAspect,
  useCreateAspect,
  useUpdateAspect,
  useDeleteAspect,
  useStartPerspectivesJob,
  usePollPerspectivesJob,
  useLabelDocs,
  useUnlabelDocs,
  useGetDocVisualization,
  useGetClusterSimilarities,
  useGetClustersBySdocId,
  useUpdateClusterDetails,
  useRAGChat,
};
