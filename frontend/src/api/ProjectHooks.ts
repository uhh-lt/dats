import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  CodeRead,
  DocumentTagRead,
  MemoRead,
  PaginatedSourceDocumentReads,
  ProjectCreate,
  ProjectRead,
  ProjectService,
  ProjectUpdate,
  UserRead,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.PROJECT_TAGS, projectId],
    () =>
      ProjectService.getProjectTagsProjectProjIdTagGet({
        projId: projectId,
      }),
    {
      select: (tag) => {
        const arrayForSort = [...tag];
        return arrayForSort.sort((a, b) => a.id - b.id);
      },
    }
  );

// project
const useGetAllProjects = () =>
  useQuery<ProjectRead[], Error>([QueryKey.PROJECTS], () => ProjectService.readAllProjectGet({}));

const useGetProject = (projectId: number) =>
  useQuery<ProjectRead, Error>([QueryKey.PROJECT, projectId], () =>
    ProjectService.readProjectProjectProjIdGet({
      projId: projectId,
    })
  );

// sdoc
const useUploadDocument = () =>
  useMutation(ProjectService.uploadProjectSdocProjectProjIdSdocPut, {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, variables.projId]);
    },
  });

const useGetProjectDocuments = (projectId: number) =>
  useQuery<PaginatedSourceDocumentReads, Error>([QueryKey.PROJECT_SDOCS, projectId], () =>
    ProjectService.getProjectSdocsProjectProjIdSdocGet({
      projId: projectId,
    })
  );

const useGetProjectDocumentsInfinite = (projectId: number) =>
  useInfiniteQuery(
    [QueryKey.PROJECT_SDOCS_INFINITE, projectId],
    async ({ pageParam = 0 }) =>
      await ProjectService.getProjectSdocsProjectProjIdSdocGet({
        projId: projectId,
        skip: pageParam,
        limit: 10,
      }),
    {
      getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_page_offset : undefined),
    }
  );

const useCreateProject = () =>
  useMutation(
    async ({ userId, requestBody }: { userId: number; requestBody: ProjectCreate }) => {
      const project = await ProjectService.createNewProjectProjectPut({ requestBody });
      await ProjectService.associateUserToProjectProjectProjIdUserUserIdPatch({
        projId: project.id,
        userId,
      });
      return project;
    },
    {
      onSuccess: (project, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
    }
  );

const useUpdateProject = () =>
  useMutation(
    (variables: { userId: number; projId: number; requestBody: ProjectUpdate }) => {
      return ProjectService.updateProjectProjectProjIdPatch({
        projId: variables.projId,
        requestBody: variables.requestBody,
      });
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
        queryClient.invalidateQueries([QueryKey.PROJECT, data.id]);
      },
    }
  );

const useDeleteProject = () =>
  useMutation(
    (variables: { userId: number; projId: number }) =>
      ProjectService.deleteProjectProjectProjIdDelete({ projId: variables.projId }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
    }
  );

// users
const useGetAllUsers = (projectId: number) =>
  useQuery<UserRead[], Error>([QueryKey.PROJECT_USERS, projectId], () =>
    ProjectService.getProjectUsersProjectProjIdUserGet({
      projId: projectId,
    })
  );
const useAddUser = () =>
  useMutation(ProjectService.associateUserToProjectProjectProjIdUserUserIdPatch, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
  });

const useRemoveUser = () =>
  useMutation(ProjectService.dissociateUserFromProjectProjectProjIdUserUserIdDelete, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
  });

// codes
const useGetAllCodes = (projectId: number) =>
  useQuery<CodeRead[], Error>(
    [QueryKey.PROJECT_CODES, projectId],
    () =>
      ProjectService.getProjectCodesProjectProjIdCodeGet({
        projId: projectId,
      }),
    {
      select: (codes) => {
        const arrayForSort = [...codes];
        return arrayForSort.sort((a, b) => a.id - b.id);
      },
    }
  );

// memo
const useGetMemo = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_PROJECT, projectId, userId],
    () =>
      ProjectService.getUserMemoProjectProjIdMemoUserIdGet({
        projId: projectId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    }
  );

const useCreateMemo = () =>
  useMutation(ProjectService.addMemoProjectProjIdMemoPut, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO_PROJECT, data.project_id, data.user_id]);
    },
  });

const ProjectHooks = {
  // tags
  useGetAllTags,
  // project
  useGetAllProjects,
  useGetProject,
  // sdoc
  useUploadDocument,
  useGetProjectDocuments,
  useGetProjectDocumentsInfinite,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  useGetAllCodes,
  // memo
  useGetMemo,
  useCreateMemo,
};

export default ProjectHooks;
