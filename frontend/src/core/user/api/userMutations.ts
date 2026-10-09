import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { ProjectUserLinks } from "@models/ProjectUserLinks";
import { UserRead } from "@models/UserRead";
import { useMutation } from "@tanstack/react-query";
import { userQueries } from "./userQueries";

// USER MUTATIONS
export const useUpdate = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "update"],
    mutationFn: UserService.updateMe,
    meta: {
      datsEvent: "USER_UPDATED",
      successMessage: (user: UserRead) => `Updated user ${user.first_name} ${user.last_name}`,
    },
  });

export const useAddUserToProject = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "addUserToProject"],
    mutationFn: UserService.associateUserToProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Added user to project (${data.users.length} members)`,
    },
  });

export const useRemoveUserFromProject = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "removeUserFromProject"],
    mutationFn: UserService.dissociateUserFromProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Removed user from project (${data.users.length} members)`,
    },
  });

export const useRegister = () =>
  useMutation({
    mutationKey: [...userQueries.all(), "register"],
    mutationFn: AuthenticationService.register,
    meta: {
      successMessage: (user: UserRead) => `Successfully registered user ${user.first_name} ${user.last_name}`,
    },
  });
