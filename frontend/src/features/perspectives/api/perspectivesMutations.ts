import { queryClient } from "@api/queryClient";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { RagService } from "@api/services/RagService";
import { jobQueries } from "@core/job";
import { AspectRead } from "@models/AspectRead";
import { ClusterRead } from "@models/ClusterRead";
import { CodeRead } from "@models/CodeRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { useMutation } from "@tanstack/react-query";
import { perspectiveQueries } from "./perspectiveQueries";

export const useCreateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "createAspect"],
    mutationFn: PerspectivesService.createAspect,
    meta: {
      datsEvent: "ASPECT_CREATED",
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

export const useUpdateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "updateAspect"],
    mutationFn: PerspectivesService.updateAspectById,
    meta: {
      datsEvent: "ASPECT_UPDATED",
      successMessage: (data: CodeRead) => `Updated aspect ${data.name}`,
    },
  });

export const useDeleteAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "deleteAspect"],
    mutationFn: PerspectivesService.removeAspectById,
    meta: {
      datsEvent: "ASPECT_DELETED",
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

export const useStartPerspectivesJob = () =>
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

export const useUpdateClusterDetails = () =>
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

export const useRAGChat = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "rAGChat"],
    mutationFn: RagService.ragSession,
  });
