import { queryClient } from "@api/queryClient";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

import { ProjectCreate } from "@models/ProjectCreate";
import { ProjectRead } from "@models/ProjectRead";
import { SDocStatus } from "@models/SDocStatus";
import { ProjectService } from "@api/services/ProjectService";

// PROJECT QUERIES
export const userProjectsQueryOptions = () =>
  queryOptions({
    queryKey: [QueryKey.USER_PROJECTS],
    queryFn: () => ProjectService.getUserProjects(),
    staleTime: 1000 * 60 * 5,
  });

interface UseProjectsQueryParams<T> {
  select?: (data: ProjectRead[]) => T;
  enabled?: boolean;
}

const useProjectsQuery = <T = ProjectRead[]>({ select, enabled }: UseProjectsQueryParams<T>) =>
  useQuery({
    ...userProjectsQueryOptions(),
    select,
    enabled,
  });

const useGetAllProjects = () => useProjectsQuery({});

const useGetProject = (projectId: number | null | undefined) =>
  useProjectsQuery({
    select: (data) => data.find((project) => project.id === projectId)!,
    enabled: !!projectId,
  });

// PROJECT MUTATIONS
const useCreateProject = () => {
  return useMutation({
    mutationFn: async ({ requestBody }: { requestBody: ProjectCreate }) => {
      return await ProjectService.createNewProject({ requestBody });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? [...oldData, data] : [data],
      );
    },
    meta: {
      successMessage: (project: ProjectRead) => `Successfully Created Project "${project.title}" (ID: ${project.id})`,
    },
  });
};

const useUpdateProject = () =>
  useMutation({
    mutationFn: ProjectService.updateProject,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? oldData.map((project) => (project.id === data.id ? data : project)) : oldData,
      );
    },
    meta: {
      successMessage: (data: ProjectRead) => `Successfully Updated Project "${data.title}"`,
    },
  });

const useDeleteProject = () =>
  useMutation({
    mutationFn: ProjectService.deleteProject,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? oldData.filter((project) => project.id !== data.id) : oldData,
      );
    },
    meta: {
      successMessage: (data: ProjectRead) => `Successfully Deleted Project "${data.title}"`,
    },
  });

const useCountSdocsWithStatus = (projectId: number, status: SDocStatus) =>
  useQuery({
    queryKey: [QueryKey.PROJECT_SDOC_STATUS_COUNT, projectId, status],
    queryFn: () => ProjectService.countSdocsWithStatus({ projectId, status }),
  });

export const ProjectHooks = {
  // project
  useGetAllProjects,
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCountSdocsWithStatus,
};
