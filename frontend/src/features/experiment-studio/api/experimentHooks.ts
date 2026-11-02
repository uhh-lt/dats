import { ExperimentService } from "@api/services/ExperimentService";
import { userQueries } from "@core/user";
import type { ExperimentRead } from "@models/ExperimentRead";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { experimentQueries } from "./experimentQueries";

const useCreateExperiment = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "createExperiment"],
    mutationFn: ExperimentService.create,
    meta: {
      datsEvent: "EXPERIMENT_CREATED",
      successMessage: (experiment: ExperimentRead) => `Created experiment ${experiment.name}`,
    },
  });

// A run creates (and its deletion deletes) a virtual user, renaming an experiment renames them. The response is the
// experiment, so the users of the project are refreshed here: the USER_* events may arrive after it is rendered.
const useRefreshUsers = () => {
  const queryClient = useQueryClient();
  return (experiment: ExperimentRead) =>
    queryClient.invalidateQueries({ queryKey: userQueries.byProject(experiment.project_id).queryKey });
};

const useUpdateExperiment = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "updateExperiment"],
    mutationFn: ExperimentService.updateById,
    // renaming an experiment renames the virtual users of its runs
    onSuccess: useRefreshUsers(),
    meta: {
      datsEvent: "EXPERIMENT_UPDATED",
      successMessage: (experiment: ExperimentRead) => `Updated experiment ${experiment.name}`,
    },
  });

const useDeleteExperiment = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "deleteExperiment"],
    mutationFn: ExperimentService.deleteById,
    onSuccess: useRefreshUsers(),
    meta: {
      datsEvent: "EXPERIMENT_DELETED",
      successMessage: (experiment: ExperimentRead) => `Deleted experiment ${experiment.name} with all its runs`,
    },
  });

const useCreateRun = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "createRun"],
    mutationFn: ExperimentService.createRun,
    onSuccess: useRefreshUsers(),
    meta: {
      datsEvent: "EXPERIMENT_UPDATED",
      successMessage: (experiment: ExperimentRead) =>
        `Started run ${experiment.runs[experiment.runs.length - 1]?.name ?? ""} of ${experiment.name}`,
    },
  });

const useDeleteRun = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "deleteRun"],
    mutationFn: ExperimentService.deleteRun,
    onSuccess: useRefreshUsers(),
    meta: {
      datsEvent: "EXPERIMENT_UPDATED",
      successMessage: "Deleted the run with its virtual user and annotations",
    },
  });

const useRefreshRunScores = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "refreshRunScores"],
    mutationFn: ExperimentService.refreshRunScores,
    meta: {
      datsEvent: "EXPERIMENT_UPDATED",
      successMessage: "Recomputed the agreement with the gold annotator",
    },
  });

const useRefreshAllRunScores = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "refreshAllRunScores"],
    mutationFn: ExperimentService.refreshAllRunScores,
    meta: {
      datsEvent: "EXPERIMENT_UPDATED",
      successMessage: "Recomputed the agreement of all finished runs with the gold annotator",
    },
  });

const useExportRunLog = () =>
  useMutation({
    mutationKey: [...experimentQueries.all(), "exportRunLog"],
    mutationFn: ExperimentService.exportRunLog,
    meta: {
      errorMessage: "Failed to export the run log",
    },
  });

export const ExperimentHooks = {
  useCreateExperiment,
  useUpdateExperiment,
  useDeleteExperiment,
  useCreateRun,
  useDeleteRun,
  useRefreshRunScores,
  useRefreshAllRunScores,
  useExportRunLog,
};
