import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { ProjectUserLinks } from "@models/ProjectUserLinks";
import { UserRead } from "@models/UserRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userQueries } from "./userQueries";

// USER QUERIES
// The queries themselves live in userQueries. The hooks below only derive data from them.

const useGetUser = (userId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.byProject(projectId),
    select: (data) => data.find((user) => user.id === userId)!,
    enabled: !!userId,
  });
};

// the project's members or its virtual users
const useGetProjectMembers = () => useGetAllUsers({ select: selectMembers });
const useGetVirtualUsers = () => useGetAllUsers({ select: selectVirtualUsers });

const selectMembers = (data: UserRead[]) => data.filter((user) => !user.is_virtual);
const selectVirtualUsers = (data: UserRead[]) => data.filter((user) => user.is_virtual);

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

const useCreateVirtualUser = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "createVirtualUser"],
    mutationFn: UserService.createVirtualUser,
    meta: {
      datsEvent: "USER_CREATED",
      successMessage: (user: UserRead) => `Created virtual user ${user.first_name}`,
      errorMessage: "Could not create the virtual user. Is its name already used in this project?",
    },
  });

const useUpdateVirtualUser = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "updateVirtualUser"],
    mutationFn: UserService.updateVirtualUser,
    meta: {
      datsEvent: "USER_UPDATED",
      successMessage: (user: UserRead) => `Renamed virtual user to ${user.first_name}`,
      errorMessage: "Could not rename the virtual user. Is the name already used in this project?",
    },
  });

const useDeleteVirtualUser = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "deleteVirtualUser"],
    mutationFn: UserService.deleteVirtualUser,
    meta: {
      datsEvent: "USER_DELETED",
      successMessage: (user: UserRead) => `Deleted virtual user ${user.first_name} and its annotations`,
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

// all users of the project: its members, then its virtual users
const useGetAllUsers = <T = UserRead[]>({ select, enabled }: UseProjectUsersQueryParams<T> = {}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.byProject(projectId),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

export const UserHooks = {
  useGetUser,
  useGetProjectMembers,
  useGetVirtualUsers,
  useCreateVirtualUser,
  useUpdateVirtualUser,
  useDeleteVirtualUser,
  useUpdateMe,
  useAddUserToProject,
  useRemoveUserFromProject,
  useRegister,
  useGetAllUsers,
};
