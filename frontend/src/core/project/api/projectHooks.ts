import { ProjectService } from "@api/services/ProjectService";
import { FeatureStatus } from "@models/FeatureStatus";
import { ProjectRead } from "@models/ProjectRead";
import { useMutation, useQuery } from "@tanstack/react-query";
import { projectQueries } from "./projectQueries";

// PROJECT QUERIES
// The queries themselves live in projectQueries. The hook below only derives data from them.

const useGetProject = (projectId: number | null | undefined) =>
  useQuery({
    ...projectQueries.userProjects(),
    select: (data) => data.find((project) => project.id === projectId)!,
    enabled: !!projectId,
  });

// The state of the project's features, refreshed every few seconds while a feature is computing.
const usePollProjectFeatures = (projectId: number) =>
  useQuery({
    ...projectQueries.features(projectId),
    refetchInterval: (query) =>
      Object.values(query.state.data ?? {}).some((state) => state.status === FeatureStatus.COMPUTING) ? 3000 : false,
  });

// PROJECT MUTATIONS
const useCreateProject = () => {
  return useMutation({
    mutationKey: [...projectQueries.all(), "createProject"],
    mutationFn: ProjectService.createProject,
    meta: {
      datsEvent: "PROJECT_CREATED",
      successMessage: (project: ProjectRead) => `Successfully Created Project "${project.title}" (ID: ${project.id})`,
    },
  });
};

const useUpdateProject = () =>
  useMutation({
    mutationKey: [...projectQueries.all(), "updateProject"],
    mutationFn: ProjectService.updateProject,
    meta: {
      datsEvent: "PROJECT_UPDATED",
      successMessage: (data: ProjectRead) => `Successfully Updated Project "${data.title}"`,
    },
  });

const useDeleteProject = () =>
  useMutation({
    mutationKey: [...projectQueries.all(), "deleteProject"],
    mutationFn: ProjectService.deleteProject,
    meta: {
      datsEvent: "PROJECT_DELETED",
      successMessage: (data: ProjectRead) => `Successfully Deleted Project "${data.title}"`,
    },
  });

export const ProjectHooks = {
  useGetProject,
  usePollProjectFeatures,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
};
