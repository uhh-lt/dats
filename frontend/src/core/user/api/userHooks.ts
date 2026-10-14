import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { ProjectUserLinks } from "@models/ProjectUserLinks";
import { UserRead } from "@models/UserRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userQueries } from "./userQueries";

// USER QUERIES
// The queries themselves live in userQueries. The hook below only derives data from them.

const useGetUser = (userId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...userQueries.byProject(projectId),
    select: (data) => data.find((user) => user.id === userId)!,
    enabled: !!userId,
  });
};

// USER MUTATIONS
const useUpdate = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "update"],
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

const useRegister = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "register"],
    mutationFn: AuthenticationService.register,
    meta: {
      successMessage: (user: UserRead) => `Successfully registered user ${user.first_name} ${user.last_name}`,
    },
  });

export const UserHooks = {
  useGetUser,
  useUpdate,
  useAddUserToProject,
  useRemoveUserFromProject,
  useRegister,
};
