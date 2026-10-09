import { queryClient } from "@api/queryClient";
import { ClassifierService } from "@api/services/ClassifierService";
import { jobQueries } from "@core/job";
import { ClassifierJobRead } from "@models/ClassifierJobRead";
import { ClassifierRead } from "@models/ClassifierRead";
import { useMutation } from "@tanstack/react-query";
import { classifierQueries } from "./classifierQueries";

export const useStartClassifierJob = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "startClassifierJob"],
    mutationFn: ClassifierService.startClassifierJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: jobQueries.classifier.byProject(job.project_id).queryKey });
    },
    meta: {
      successMessage: (data: ClassifierJobRead) =>
        `Started Classifier Job as a new background task (ID: ${data.job_id})`,
    },
  });

export const useUpdateClassifier = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "updateClassifier"],
    mutationFn: ClassifierService.updateById,
    meta: {
      datsEvent: "CLASSIFIER_UPDATED",
      successMessage: (data: ClassifierRead) => `Updated classifier ${data.name}`,
    },
  });

export const useDeleteClassifier = () =>
  useMutation({
    mutationKey: [...classifierQueries.all(), "deleteClassifier"],
    mutationFn: ClassifierService.deleteById,
    meta: {
      datsEvent: "CLASSIFIER_DELETED",
      successMessage: (data: ClassifierRead) => `Deleted classifier ${data.name}`,
    },
  });
