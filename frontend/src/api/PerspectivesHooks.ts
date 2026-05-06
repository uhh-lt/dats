import { useMutation, useQuery } from "@tanstack/react-query";
import { MyFilter } from "../components/FilterDialog/filterUtils.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { QueryKey } from "./QueryKey.ts";
import { AspectRead } from "./openapi/models/AspectRead.ts";
import { ClusterRead } from "./openapi/models/ClusterRead.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { JobStatus } from "./openapi/models/JobStatus.ts";
import { PerspectivesJobRead } from "./openapi/models/PerspectivesJobRead.ts";
import { SdocColumns } from "./openapi/models/SdocColumns.ts";
import { PerspectivesService } from "./openapi/services/PerspectivesService.ts";
import { RagService } from "./openapi/services/RagService.ts";

// ASPECTS

export type AspectMap = Record<number, AspectRead>;

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

const useProjectAspectsQuery = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_ASPECTS, projectId],
    queryFn: async () => {
      const aspects = await PerspectivesService.getAllAspects({
        projId: projectId!,
      });
      return aspects.reduce((acc, aspect) => {
        acc[aspect.id] = aspect;
        return acc;
      }, {} as AspectMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
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

// ASPECT MUTATIONS
const useCreateAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.createAspect,
    onSuccess: (data, variables) => {
      console.log("Aspect created:", data);
      queryClient.setQueryData<AspectMap>([QueryKey.PROJECT_ASPECTS, variables.requestBody.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

const useUpdateAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.updateAspectById,
    onSuccess: (data) => {
      queryClient.setQueryData<AspectMap>([QueryKey.PROJECT_ASPECTS, data.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (data: CodeRead) => `Updated aspect ${data.name}`,
    },
  });

const useDeleteAspect = () =>
  useMutation({
    mutationFn: PerspectivesService.removeAspectById,
    onSuccess: (data) => {
      queryClient.setQueryData<AspectMap>([QueryKey.PROJECT_ASPECTS, data.project_id], (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        delete newData[data.id];
        return newData;
      });
    },
    meta: {
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

// PERSPECTIVES JOBS

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

const usePollPerspectivesJob = (
  perspectivesJobId: string | null | undefined,
  initialData: PerspectivesJobRead | undefined,
) => {
  return useQuery<PerspectivesJobRead, Error>({
    queryKey: [QueryKey.PERSPECTIVES_JOB, perspectivesJobId],
    queryFn: () =>
      PerspectivesService.getPerspectivesJob({
        perspectivesJobId: perspectivesJobId!,
      }),
    enabled: !!perspectivesJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
      const localDate = new Date();
      if (
        query.state.data.finished &&
        localDate.getTime() - dateToLocaleDate(query.state.data.finished).getTime() < 3 * 60 * 1000
      ) {
        queryClient.invalidateQueries({
          queryKey: [QueryKey.DOCUMENT_VISUALIZATION, query.state.data.input.aspect_id],
        });
        queryClient.invalidateQueries({ queryKey: [QueryKey.CLUSTER_SIMILARITIES, query.state.data.input.aspect_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, query.state.data.input.aspect_id] });
      }

      switch (query.state.data.status) {
        case JobStatus.CANCELED:
        case JobStatus.FAILED:
        case JobStatus.FINISHED:
        case JobStatus.STOPPED:
          return false;
        case JobStatus.DEFERRED:
        case JobStatus.QUEUED:
        case JobStatus.SCHEDULED:
        case JobStatus.STARTED:
          return 1000;
        default:
          return false;
      }
    },
    initialData,
  });
};

// LABLING

const useLabelDocs = () =>
  useMutation({
    mutationFn: PerspectivesService.acceptLabel,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, variables.aspectId] });
    },
    meta: {
      successMessage: (data: number) => `Accepted cluster(s) for ${data} documents`,
    },
  });

const useUnlabelDocs = () =>
  useMutation({
    mutationFn: PerspectivesService.revertLabel,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, variables.aspectId] });
    },
    meta: {
      successMessage: (data: number) => `Reverted cluster(s) for ${data} documents`,
    },
  });

// VISUALIZATION

const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state: RootState) => state.perspectives.searchQuery);
  const filter = useAppSelector((state: RootState) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useQuery({
    queryKey: [QueryKey.DOCUMENT_VISUALIZATION, aspectId, searchQuery, filter],
    queryFn: () =>
      PerspectivesService.visualizeDocuments({
        aspectId,
        searchQuery,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          sorts: [],
        },
      }),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
};

const useGetClusterSimilarities = (aspectId: number) => {
  return useQuery({
    queryKey: [QueryKey.CLUSTER_SIMILARITIES, aspectId],
    queryFn: () =>
      PerspectivesService.getClusterSimilarities({
        aspectId,
      }),
    staleTime: 1000 * 60 * 5,
  });
};

// Clusters
const useUpdateClusterDetails = () =>
  useMutation({
    mutationFn: PerspectivesService.updateClusterDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, data.aspect_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, data.aspect_id] });
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

// CHAT
const useRAGChat = () =>
  useMutation({
    mutationFn: RagService.ragSession,
    onSuccess: (data) => {
      console.log(data);
    },
  });

// HISTORY (undo, redo)
const useUndo = () =>
  useMutation({
    mutationFn: PerspectivesService.undoPerspectivesHistory,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.CLUSTER_SIMILARITIES, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, variables.aspectId] });
    },
  });

const useRedo = () =>
  useMutation({
    mutationFn: PerspectivesService.redoPerspectivesHistory,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.CLUSTER_SIMILARITIES, variables.aspectId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.ASPECT_HISTORY, variables.aspectId] });
    },
  });

const useGetHistory = (aspectId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.ASPECT_HISTORY, aspectId],
    queryFn: () => PerspectivesService.listPerspectivesHistory({ aspectId: aspectId! }),
    enabled: !!aspectId,
    staleTime: 1000 * 60 * 5,
  });

const PerspectivesHooks = {
  // aspects
  useGetAllAspectsList,
  useGetAspect,
  useGetDocumentAspect,
  useCreateAspect,
  useUpdateAspect,
  useDeleteAspect,
  // tm jobs
  useStartPerspectivesJob,
  usePollPerspectivesJob,
  // labeling
  useLabelDocs,
  useUnlabelDocs,
  // visualization
  useGetDocVisualization,
  useGetClusterSimilarities,
  // cluster
  useGetClustersBySdocId,
  useUpdateClusterDetails,
  // chat
  useRAGChat,
  // history
  useUndo,
  useRedo,
  useGetHistory,
};

export default PerspectivesHooks;
