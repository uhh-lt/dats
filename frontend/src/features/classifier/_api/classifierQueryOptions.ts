import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { ClassifierService } from "@api/services/ClassifierService";
import { ClassifierInferenceParams } from "@models/ClassifierInferenceParams";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierModel } from "@models/ClassifierModel";
import { ClassifierRead } from "@models/ClassifierRead";
import { ClassifierTask } from "@models/ClassifierTask";
import { JobStatus } from "@models/JobStatus";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { dateToLocaleDate } from "@utils/DateUtils";

export type ClassifierMap = Record<number, ClassifierRead>;

export const projectClassifiersQueryOptions = (projectId: number) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_CLASSIFIERS, projectId],
    queryFn: async () => {
      const classifiers = await ClassifierService.getByProject({
        projId: projectId,
      });

      return classifiers.reduce((acc, classifier) => {
        acc[classifier.id] = classifier;
        return acc;
      }, {} as ClassifierMap);
    },
    staleTime: 1000 * 60 * 5,
  });

export const projectClassifierJobsQueryOptions = (projectId: number) =>
  queryOptions<ClassifierJobRead[]>({
    queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, projectId],
    queryFn: () =>
      ClassifierService.getClassifierJobsByProject({
        projectId,
      }),
  });

const useStartClassifierJob = () =>
  useMutation({
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
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

      const localDate = new Date();
      if (data.finished && localDate.getTime() - dateToLocaleDate(data.finished).getTime() < 3 * 60 * 1000) {
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIER_JOBS, data.project_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_CLASSIFIERS, data.project_id] });

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

const useGetAllClassifiers = (projectId: number) =>
  useQuery({
    ...projectClassifiersQueryOptions(projectId),
    select: (data) => Object.values(data),
  });

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

const useComputeDatasetStatistics2 = () =>
  useMutation({
    mutationFn: ClassifierService.computeDatasetStatistics2,
  });

export const ClassifierHooks = {
  usePollClassifierJob,
  useStartClassifierJob,
  useGetAllClassifiers,
  useUpdateClassifier,
  useDeleteClassifier,
  useComputeDatasetStatistics2,
};
