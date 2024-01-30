import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import {
  ActionQueryParameters,
  ActionRead,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  PaginatedSourceDocumentReads,
  PreprocessingJobRead,
  ProjectCreate,
  ProjectMetadataRead,
  ProjectRead,
  ProjectService,
  ProjectUpdate,
  UserRead,
} from "./openapi";
import { useSelectEnabledCodes } from "./utils";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.PROJECT_TAGS, projectId],
    () =>
      ProjectService.getProjectTags({
        projId: projectId,
      }),
    {
      select: (tag) => {
        const arrayForSort = [...tag];
        return arrayForSort.sort((a, b) => a.id - b.id);
      },
    },
  );

const useGetProject = (projectId: number | null | undefined) =>
  useQuery<ProjectRead, Error>(
    [QueryKey.PROJECT, projectId],
    () =>
      ProjectService.readProject({
        projId: projectId!,
      }),
    { enabled: !!projectId },
  );

// sdoc
const useUploadDocument = () =>
  useMutation(ProjectService.uploadProjectSdoc, {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, variables.projId]);
    },
    meta: {
      successMessage: (data: PreprocessingJobRead) =>
        `Successfully uploaded ${data.payloads.length} documents and started PreprocessingJob ${data.id} in the background!`,
    },
  });

const useGetProjectDocuments = (projectId: number) =>
  useQuery<PaginatedSourceDocumentReads, Error>([QueryKey.PROJECT_SDOCS, projectId], () =>
    ProjectService.getProjectSdocs({
      projId: projectId,
    }),
  );

const useGetProjectDocumentsInfinite = (projectId: number, refetch: boolean) =>
  useInfiniteQuery(
    [QueryKey.PROJECT_SDOCS_INFINITE, projectId],
    async ({ pageParam = 0 }) =>
      await ProjectService.getProjectSdocs({
        projId: projectId,
        skip: pageParam,
        limit: 10,
      }),
    {
      getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_page_offset : undefined),
      refetchInterval: refetch ? 1000 : false,
    },
  );

const useCreateProject = () =>
  useMutation(
    async ({ userId, requestBody }: { userId: number; requestBody: ProjectCreate }) => {
      return await ProjectService.createNewProject({ requestBody });
    },
    {
      onSuccess: (project, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
      meta: {
        successMessage: (project: ProjectRead) =>
          "Successfully Created Project " + project.title + " with id " + project.id + "!",
      },
    },
  );

const useUpdateProject = () =>
  useMutation(
    (variables: { userId: number; projId: number; requestBody: ProjectUpdate }) => {
      return ProjectService.updateProject({
        projId: variables.projId,
        requestBody: variables.requestBody,
      });
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
        queryClient.invalidateQueries([QueryKey.PROJECT, data.id]);
      },
      meta: {
        successMessage: (data: ProjectRead) => `Successfully Updated Project with id ${data.id}!`,
      },
    },
  );

const useDeleteProject = () =>
  useMutation(
    (variables: { userId: number; projId: number }) => ProjectService.deleteProject({ projId: variables.projId }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
      meta: {
        successMessage: (data: ProjectRead) =>
          "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
      },
    },
  );

// users
const useGetAllUsers = (projectId: number | null | undefined) =>
  useQuery<UserRead[], Error>(
    [QueryKey.PROJECT_USERS, projectId],
    () =>
      ProjectService.getProjectUsers({
        projId: projectId!,
      }),
    {
      enabled: !!projectId,
    },
  );
const useAddUser = () =>
  useMutation(ProjectService.associateUserToProject, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
    meta: {
      successMessage: (user: UserRead) => "Successfully added user " + user.first_name + "!",
    },
  });

const useRemoveUser = () =>
  useMutation(ProjectService.dissociateUserFromProject, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
    meta: {
      successMessage: (data: UserRead) => "Successfully removed user " + data.first_name + "!",
    },
  });

// codes
const useGetAllCodes = (projectId: number, returnAll: boolean = false) => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useQuery<CodeRead[], Error>(
    [QueryKey.PROJECT_CODES, projectId],
    () =>
      ProjectService.getProjectCodes({
        projId: projectId,
      }),
    {
      select: returnAll ? undefined : selectEnabledCodes,
    },
  );
};

// memo
const useGetMemo = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_PROJECT, projectId, userId],
    () =>
      ProjectService.getUserMemo({
        projId: projectId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useGetAllUserMemos = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.USER_MEMOS, projectId, userId],
    () =>
      ProjectService.getUserMemosOfProject({
        projId: projectId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useCreateMemo = () =>
  useMutation(ProjectService.addMemo, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO_PROJECT, data.project_id, data.user_id]);
    },
  });

// actions
const useGetActions = (projectId: number, userId: number) =>
  useQuery<Array<ActionRead>, Error>(
    [QueryKey.ACTION, projectId, userId],
    () =>
      ProjectService.getUserActionsOfProject({
        projId: projectId,
        userId: userId,
      }),
    {
      refetchOnWindowFocus: false,
    },
  );

const useQueryActions = (requestBody: ActionQueryParameters) =>
  useQuery<ActionRead[], Error>([QueryKey.ACTIONS_QUERY, requestBody], () =>
    ProjectService.queryActionsOfProject({
      requestBody: requestBody,
    }),
  );

// metadata
const useGetMetadata = (projectId: number) =>
  useQuery<ProjectMetadataRead[], Error>([QueryKey.PROJECT_METADATAS, projectId], () =>
    ProjectService.getAllMetadata({
      projId: projectId,
    }),
  );

// duplicates
const useFindDuplicateTextDocuments = () => useMutation(ProjectService.findDuplicateTextSdocs);

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
  useGetProjectDocuments,
  useGetProjectDocumentsInfinite,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  // codes
  useGetAllCodes,
  // memo
  useGetMemo,
  useGetAllUserMemos,
  useCreateMemo,
  // actions
  useGetActions,
  useQueryActions,
  // metadata
  useGetMetadata,
  // duplicates
  useFindDuplicateTextDocuments,
};

export default ProjectHooks;
