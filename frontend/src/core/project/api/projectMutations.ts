import { ProjectService } from "@api/services/ProjectService";
import { ProjectCreate } from "@models/ProjectCreate";
import { ProjectRead } from "@models/ProjectRead";
import { useMutation } from "@tanstack/react-query";
import { projectQueries } from "./projectQueries";

// PROJECT MUTATIONS
export const useCreateProject = () => {
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

export const useUpdateProject = () =>
  useMutation({
    mutationKey: [...projectQueries.all(), "updateProject"],
    mutationFn: ProjectService.updateProject,
    meta: {
      datsEvent: "PROJECT_UPDATED",
      successMessage: (data: ProjectRead) => `Successfully Updated Project "${data.title}"`,
    },
  });

export const useDeleteProject = () =>
  useMutation({
    mutationKey: [...projectQueries.all(), "deleteProject"],
    mutationFn: ProjectService.deleteProject,
    meta: {
      datsEvent: "PROJECT_DELETED",
      successMessage: (data: ProjectRead) => `Successfully Deleted Project "${data.title}"`,
    },
  });
