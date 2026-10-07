import { projectQueries } from "@api/queries/projectQueries";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ProjectService } from "@api/services/ProjectService";
import { ProjectCreate } from "@models/ProjectCreate";
import { ProjectRead } from "@models/ProjectRead";

// PROJECT QUERIES
// The queries themselves live in projectQueries. The hook below only derives data from them.

const useGetProject = (projectId: number | null | undefined) =>
  useQuery({
    ...projectQueries.userProjects(),
    select: (data) => data.find((project) => project.id === projectId)!,
    enabled: !!projectId,
  });

// PROJECT MUTATIONS
const useCreateProject = () => {
  return useMutation({
    mutationKey: [...projectQueries.all(), "createProject"],
    mutationFn: async ({ requestBody }: { requestBody: ProjectCreate }) => {
      return await ProjectService.createProject({ requestBody });
    },
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
  // project
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
};
