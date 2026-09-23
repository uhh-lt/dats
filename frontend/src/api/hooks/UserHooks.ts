import { AuthenticationService } from "@api/services/AuthenticationService";
import { UserService } from "@api/services/UserService";
import { ProjectUserLinks } from "@models/ProjectUserLinks";
import { UserRead } from "@models/UserRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// USER QUERIES
interface UseProjectUsersQueryParams<T> {
  select?: (data: UserRead[]) => T;
  enabled?: boolean;
}

const useProjectUsersQuery = <T = UserRead[]>({ select, enabled }: UseProjectUsersQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_USERS, projectId],
    queryFn: () =>
      UserService.getByProject({
        projId: projectId!,
      }),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const useGetAllUsers = () => useProjectUsersQuery({});

const useGetUser = (userId: number | null | undefined) =>
  useProjectUsersQuery({
    select: (data) => data.find((user) => user.id === userId)!,
    enabled: !!userId,
  });

// USER MUTATIONS
const useUpdate = () =>
  useMutation({
    mutationFn: UserService.updateMe,
    meta: {
      datsEvent: "USER_UPDATED",
      successMessage: (user: UserRead) => `Updated user ${user.first_name} ${user.last_name}`,
    },
  });

const useAddUserToProject = () =>
  useMutation({
    mutationFn: UserService.associateUserToProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Added user to project (${data.users.length} members)`,
    },
  });

const useRemoveUserFromProject = () =>
  useMutation({
    mutationFn: UserService.dissociateUserFromProject,
    meta: {
      datsEvent: "PROJECT_USERS_LINKED",
      successMessage: (data: ProjectUserLinks) => `Removed user from project (${data.users.length} members)`,
    },
  });

const useRegister = () =>
  useMutation({
    mutationFn: AuthenticationService.register,
    meta: {
      successMessage: (user: UserRead) => `Successfully registered user ${user.first_name} ${user.last_name}`,
    },
  });

export const UserHooks = {
  useGetAllUsers,
  useGetUser,
  useUpdate,
  useAddUserToProject,
  useRemoveUserFromProject,
  useRegister,
};
