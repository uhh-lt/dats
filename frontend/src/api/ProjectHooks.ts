import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";

import { useAuth } from "../auth/useAuth.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { PreprocessingJobRead } from "./openapi/models/PreprocessingJobRead.ts";
import { ProjectCreate } from "./openapi/models/ProjectCreate.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { ProjectRead } from "./openapi/models/ProjectRead.ts";
import { ProjectUpdate } from "./openapi/models/ProjectUpdate.ts";
import { UserRead } from "./openapi/models/UserRead.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () =>
      ProjectService.getProjectTags({
        projId: projectId,
      }),
    select: (tag) => {
      const arrayForSort = [...tag];
      return arrayForSort.sort((a, b) => a.id - b.id);
    },
  });

const useGetProject = (projectId: number | null | undefined) =>
  useQuery<ProjectRead, Error>({
    queryKey: [QueryKey.PROJECT, projectId],
    queryFn: () =>
      ProjectService.readProject({
        projId: projectId!,
      }),
    enabled: !!projectId,
  });

// sdoc
const useUploadDocument = () =>
  useMutation({
    mutationFn: ProjectService.uploadProjectSdoc,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS, variables.projId] });
    },
    meta: {
      successMessage: (data: PreprocessingJobRead) =>
        `Successfully uploaded ${data.payloads.length} documents and started PreprocessingJob ${data.id} in the background!`,
    },
  });

const useCreateProject = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ requestBody }: { requestBody: ProjectCreate }) => {
      return await ProjectService.createNewProject({ requestBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user?.id] });
    },
    meta: {
      successMessage: (project: ProjectRead) =>
        "Successfully Created Project " + project.title + " with id " + project.id + "!",
    },
  });
};

const useUpdateProject = () =>
  useMutation({
    mutationFn: (variables: { userId: number; projId: number; requestBody: ProjectUpdate }) => {
      return ProjectService.updateProject({
        projId: variables.projId,
        requestBody: variables.requestBody,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT, data.id] });
    },
    meta: {
      successMessage: (data: ProjectRead) => `Successfully Updated Project with id ${data.id}!`,
    },
  });

const useDeleteProject = () =>
  useMutation({
    mutationFn: (variables: { userId: number; projId: number }) =>
      ProjectService.deleteProject({ projId: variables.projId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, variables.userId] });
    },
    meta: {
      successMessage: (data: ProjectRead) => "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
    },
  });

// users
const useGetAllUsers = (projectId: number | null | undefined) =>
  useQuery<UserRead[], Error>({
    queryKey: [QueryKey.PROJECT_USERS, projectId],
    queryFn: () =>
      ProjectService.getProjectUsers({
        projId: projectId!,
      }),
    enabled: !!projectId,
  });
const useAddUser = () =>
  useMutation({
    mutationFn: ProjectService.associateUserToProject,
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, variables.projId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user.id] });
    },
    meta: {
      successMessage: (user: UserRead) => "Successfully added user " + user.first_name + "!",
    },
  });

const useRemoveUser = () =>
  useMutation({
    mutationFn: ProjectService.dissociateUserFromProject,
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, variables.projId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user.id] });
    },
    meta: {
      successMessage: (data: UserRead) => "Successfully removed user " + data.first_name + "!",
    },
  });

// memo
const useGetOrCreateMemo = (projectId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_PROJECT, projectId],
    queryFn: () =>
      ProjectService.getOrCreateUserMemo({
        projId: projectId!,
      }),
    retry: false,
    enabled: !!projectId,
  });

const useGetAllUserMemos = (projectId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.USER_MEMOS, projectId],
    queryFn: () =>
      ProjectService.getUserMemosOfProject({
        projId: projectId!,
      }),
    retry: false,
    enabled: !!projectId,
  });

// metadata
const useGetMetadata = (projectId: number) =>
  useQuery<ProjectMetadataRead[], Error>({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: () =>
      ProjectService.getAllMetadata({
        projId: projectId,
      }),
  });

// duplicates
const useFindDuplicateTextDocuments = () => useMutation({ mutationFn: ProjectService.findDuplicateTextSdocs });

const ProjectHooks = {
  // tags
  useGetAllTags,
  // project
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // sdoc
  useUploadDocument,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  // memo
  useGetOrCreateMemo,
  useGetAllUserMemos,
  // metadata
  useGetMetadata,
  // duplicates
  useFindDuplicateTextDocuments,
};

export default ProjectHooks;
