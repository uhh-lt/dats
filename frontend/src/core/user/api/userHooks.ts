import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { ProjectUserLinks } from "@models/ProjectUserLinks";
import { UserKind } from "@models/UserKind";
import { UserRead } from "@models/UserRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userQueries } from "./userQueries";

// USER QUERIES
// The queries themselves live in userQueries. The hooks below only derive data from them.

// any annotator of the project: a member or a virtual annotator
const useGetUser = (userId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.annotatorsByProject(projectId),
    select: (data) => data.find((user) => user.id === userId)!,
    enabled: !!userId,
  });
};

// the members of the project (human users), e.g. for the member management
const useGetProjectMembers = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.byProject(projectId),
    enabled: !!projectId,
  });
};

// the virtual annotators of the project
const useGetVirtualAnnotators = () => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.annotatorsByProject(projectId),
    select: selectVirtualAnnotators,
    enabled: !!projectId,
  });
};

const selectVirtualAnnotators = (data: UserRead[]) => data.filter((user) => user.kind === UserKind.VIRTUAL);

// USER MUTATIONS
const useUpdateMe = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "updateMe"],
    mutationFn: UserService.updateMe,
    meta: {
      datsEvent: "USER_UPDATED",
      successMessage: (user: UserRead) => `Updated user ${user.first_name} ${user.last_name}`,
    },
  });

const useAddUserToProject = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "addUserToProject"],
    mutationFn: UserService.associateUserToProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Added user to project (${data.users.length} members)`,
    },
  });

const useRemoveUserFromProject = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "removeUserFromProject"],
    mutationFn: UserService.dissociateUserFromProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Removed user from project (${data.users.length} members)`,
    },
  });

const useCreateVirtualAnnotator = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "createVirtualAnnotator"],
    mutationFn: UserService.createVirtualAnnotator,
    meta: {
      datsEvent: "VIRTUAL_ANNOTATOR_CREATED",
      successMessage: (user: UserRead) => `Created virtual annotator ${user.first_name}`,
      errorMessage: "Could not create the virtual annotator. Is its name already used in this project?",
    },
  });

const useUpdateVirtualAnnotator = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "updateVirtualAnnotator"],
    mutationFn: UserService.updateVirtualAnnotator,
    meta: {
      datsEvent: "VIRTUAL_ANNOTATOR_UPDATED",
      successMessage: (user: UserRead) => `Renamed virtual annotator to ${user.first_name}`,
      errorMessage: "Could not rename the virtual annotator. Is the name already used in this project?",
    },
  });

const useDeleteVirtualAnnotator = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "deleteVirtualAnnotator"],
    mutationFn: UserService.deleteVirtualAnnotator,
    meta: {
      datsEvent: "VIRTUAL_ANNOTATOR_DELETED",
      successMessage: (user: UserRead) => `Deleted virtual annotator ${user.first_name} and its annotations`,
    },
  });

const useRegister = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "register"],
    mutationFn: AuthenticationService.register,
    meta: {
      successMessage: (user: UserRead) => `Successfully registered user ${user.first_name} ${user.last_name}`,
    },
  });

interface UseProjectUsersQueryParams<T> {
  select?: (data: UserRead[]) => T;
  enabled?: boolean;
}

// all annotators of the project: its members, then its virtual annotators
const useGetAllUsers = <T = UserRead[]>({ select, enabled }: UseProjectUsersQueryParams<T> = {}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.annotatorsByProject(projectId),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

export const UserHooks = {
  useGetUser,
  useGetProjectMembers,
  useGetVirtualAnnotators,
  useCreateVirtualAnnotator,
  useUpdateVirtualAnnotator,
  useDeleteVirtualAnnotator,
  useUpdateMe,
  useAddUserToProject,
  useRemoveUserFromProject,
  useRegister,
  useGetAllUsers,
};
