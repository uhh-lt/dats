import { useMutation, useQuery } from "@tanstack/react-query";
import { MyFilter } from "../components/FilterDialog/filterUtils.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { dateToLocaleDate } from "../utils/DateUtils.ts";
import { QueryKey } from "./QueryKey.ts";
import { AspectRead } from "./openapi/models/AspectRead.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { SdocColumns } from "./openapi/models/SdocColumns.ts";
import { TMJobRead } from "./openapi/models/TMJobRead.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { TopicModelService } from "./openapi/services/TopicModelService.ts";

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
      const aspects = await ProjectService.getAllAspects({
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

// CODE MUTATIONS
const useCreateAspect = () =>
  useMutation({
    mutationFn: TopicModelService.createAspect,
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
    mutationFn: TopicModelService.updateAspectById,
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
    mutationFn: TopicModelService.removeAspectById,
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

// TM JOBS

const useStartTMJob = () =>
  useMutation({
    mutationFn: TopicModelService.startTmJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ASPECTS, job.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.TM_JOB, job.id] });
    },
    meta: {
      successMessage: (data: TMJobRead) => `Started TM Job as a new background task (ID: ${data.id})`,
    },
  });

const usePollTMJob = (tmJobId: string | null | undefined, initialData: TMJobRead | undefined) => {
  return useQuery<TMJobRead, Error>({
    queryKey: [QueryKey.TM_JOB, tmJobId],
    queryFn: () =>
      TopicModelService.getTmJob({
        tmJobId: tmJobId!,
      }),
    enabled: !!tmJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }

      if (query.state.data.status) {
        // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
        const localDate = new Date();
        const localUpdatedDate = dateToLocaleDate(query.state.data.updated);
        if (
          query.state.data.status === BackgroundJobStatus.FINISHED &&
          localDate.getTime() - localUpdatedDate.getTime() < 3 * 60 * 1000
        ) {
          queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, query.state.data.aspect_id] });
        }
      }

      if (query.state.data.status) {
        switch (query.state.data.status) {
          case BackgroundJobStatus.ERRORNEOUS:
          case BackgroundJobStatus.FINISHED:
            return false;
          case BackgroundJobStatus.WAITING:
          case BackgroundJobStatus.RUNNING:
            return 1000;
        }
      }
      return false;
    },
    initialData,
  });
};

// LABLING

const useLabelDocs = () =>
  useMutation({
    mutationFn: TopicModelService.acceptLabel,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
    },
    meta: {
      successMessage: (data: number) => `Accepted topic(s) for ${data} documents`,
    },
  });

const useUnlabelDocs = () =>
  useMutation({
    mutationFn: TopicModelService.revertLabel,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DOCUMENT_VISUALIZATION, variables.aspectId] });
    },
    meta: {
      successMessage: (data: number) => `Reverted topic(s) for ${data} documents`,
    },
  });

// VISUALIZATION

const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state: RootState) => state.atlas.searchQuery);
  const filter = useAppSelector((state: RootState) => state.atlas.filter[`aspect-${aspectId}`]);
  console.log("Hi from useGetDocVisualization");
  return useQuery({
    queryKey: [QueryKey.DOCUMENT_VISUALIZATION, aspectId, searchQuery, filter],
    queryFn: () =>
      TopicModelService.visualizeDocuments({
        aspectId,
        searchQuery,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          sorts: [],
        },
      }),
    staleTime: 1000 * 60 * 5,
  });
};

// Topics

const useGetTopicsBySdocId = (aspectId: number | null | undefined, sdocId: number | null | undefined) =>
  useQuery({
    queryKey: [QueryKey.SDOC_TOPICS, aspectId, sdocId],
    queryFn: () => TopicModelService.getTopicsForSdoc({ aspectId: aspectId!, sdocId: sdocId! }),
    enabled: !!aspectId && !!sdocId,
    staleTime: 1000 * 60 * 5,
  });

const TopicModellingHooks = {
  // aspects
  useGetAllAspectsList,
  useGetAspect,
  useCreateAspect,
  useUpdateAspect,
  useDeleteAspect,
  // tm jobs
  useStartTMJob,
  usePollTMJob,
  // labeling
  useLabelDocs,
  useUnlabelDocs,
  // visualization
  useGetDocVisualization,
  // topics
  useGetTopicsBySdocId,
};

export default TopicModellingHooks;
