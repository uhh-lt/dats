import { ClassifierInferenceParams } from "@api/models/ClassifierInferenceParams";
import { ClassifierJobRead } from "@api/models/ClassifierJobRead";
import { ClassifierModel } from "@api/models/ClassifierModel";
import { ClassifierRead } from "@api/models/ClassifierRead";
import { ClassifierTask } from "@api/models/ClassifierTask";
import { JobStatus } from "@api/models/JobStatus";
import { ClassifierService } from "@api/services/ClassifierService";
import { useAppSelector } from "@plugins/redux";
import { queryClient } from "@plugins/tanstack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { dateToLocaleDate } from "@utils/DateUtils";
import { QueryKey } from "./QueryKey";

const useStartClassifierJob = () =>
  useMutation({
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
      // force refetch of all classifier jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, job.project_id] });
    },
    meta: {
      successMessage: (data: ClassifierJobRead) =>
        `Started Classifier Job as a new background task (ID: ${data.job_id})`,
    },
  });

const usePollClassifierJob = (classifierJobId: string | undefined, initialData: ClassifierJobRead | undefined) => {
  return useQuery<ClassifierJobRead, Error>({
    queryKey: [QueryKey.CLASSIFIER_JOB, classifierJobId],
    queryFn: () =>
      ClassifierService.getClassifierJobById({
        jobId: classifierJobId!,
      }),
    enabled: !!classifierJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return 1000;
      }

      // do invalidation if the status is FINISHED (and the job is max 3 minutes old)
      const localDate = new Date();
      if (data.finished && localDate.getTime() - dateToLocaleDate(data.finished).getTime() < 3 * 60 * 1000) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, data.project_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIERS, data.project_id] });

        // invalidate sdoc tags if it was an inference job with document classifier
        if (
          data.input.model_type === ClassifierModel.DOCUMENT &&
          data.input.task_type === ClassifierTask.INFERENCE &&
          data.output
        ) {
          (data.input.task_parameters as ClassifierInferenceParams).sdoc_ids.forEach((sdocId) => {
            queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
          });
        }
      }

      switch (data.status) {
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

const useGetAllClassifierJobs = (projectId: number) => {
  return useQuery<ClassifierJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, projectId],
    queryFn: () =>
      ClassifierService.getClassifierJobsByProject({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

export type ClassifierMap = Record<number, ClassifierRead>;
interface UseProjectClassifiersQueryParams<T> {
  select?: (data: ClassifierMap) => T;
  enabled?: boolean;
}

const useProjectClassifiersQuery = <T = ClassifierMap>({ select, enabled }: UseProjectClassifiersQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_CLASSIFIERS, projectId],
    queryFn: async () => {
      const classifiers = await ClassifierService.getByProject({
        projId: projectId!,
      });
      return classifiers.reduce((acc, code) => {
        acc[code.id] = code;
        return acc;
      }, {} as ClassifierMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetClassifier = (classifierId: number | null | undefined) =>
  useProjectClassifiersQuery({
    select: (data) => data[classifierId!],
    enabled: !!classifierId,
  });

const useGetAllClassifiers = () => useProjectClassifiersQuery({ select: (data) => Object.values(data) });

const useUpdateClassifier = () =>
  useMutation({
    mutationFn: ClassifierService.updateById,
    onSuccess: (data) => {
      queryClient.setQueryData<ClassifierMap>([QueryKey.PROJECT_CLASSIFIERS, data.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
    meta: {
      successMessage: (data: ClassifierRead) => `Updated classifier ${data.name}`,
    },
  });

const useDeleteClassifier = () =>
  useMutation({
    mutationFn: ClassifierService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData<ClassifierMap>([QueryKey.PROJECT_CLASSIFIERS, data.project_id], (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        delete newData[data.id];
        return newData;
      });
    },
    meta: {
      successMessage: (data: ClassifierRead) => `Deleted classifier ${data.name}`,
    },
  });

const useComputeDatasetStatistics = () =>
  useMutation({
    mutationFn: ClassifierService.computeDatasetStatistics,
  });

const useComputeDatasetStatistics2 = () =>
  useMutation({
    mutationFn: ClassifierService.computeDatasetStatistics2,
  });

export const ClassifierHooks = {
  usePollClassifierJob,
  useStartClassifierJob,
  useGetAllClassifierJobs,
  useGetClassifier,
  useGetAllClassifiers,
  useUpdateClassifier,
  useDeleteClassifier,
  useComputeDatasetStatistics,
  useComputeDatasetStatistics2,
};
