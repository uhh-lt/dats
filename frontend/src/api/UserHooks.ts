import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { UserRead } from "./openapi/models/UserRead.ts";
import { AuthenticationService } from "./openapi/services/AuthenticationService.ts";
import { UserService } from "./openapi/services/UserService.ts";

// USER QUERIES
interface UseProjectUsersQueryParams<T> {
  select?: (data: UserRead[]) => T;
  enabled?: boolean;
}

const useProjectUsersQuery = <T = UserRead[]>({ select, enabled }: UseProjectUsersQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_USERS, projectId],
    queryFn: () =>
      UserService.getByProject({
        projId: projectId!,
      }),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
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
    onSuccess: (data) => {
      queryClient
        .getQueryCache()
        .findAll({ queryKey: [QueryKey.PROJECT_USERS] })
        .forEach((query) => {
          queryClient.setQueryData<UserRead[]>(query.queryKey, (oldData) =>
            oldData ? oldData.map((user) => (user.id === data.id ? data : user)) : oldData,
          );
        });
    },
    meta: {
      successMessage: (user: UserRead) => `Updated user ${user.first_name} ${user.last_name}`,
    },
  });

const useAddUserToProject = () =>
  useMutation({
    mutationFn: UserService.associateUserToProject,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<UserRead[]>([QueryKey.PROJECT_USERS, variables.projId], (oldData) =>
        oldData ? [...oldData, data] : [data],
      );
    },
    meta: {
      successMessage: (user: UserRead) => `Added user ${user.first_name} ${user.last_name} to project`,
    },
  });

const useRemoveUserFromProject = () =>
  useMutation({
    mutationFn: UserService.dissociateUserFromProject,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<UserRead[]>([QueryKey.PROJECT_USERS, variables.projId], (oldData) =>
        oldData ? oldData.filter((user) => user.id !== data.id) : oldData,
      );
    },
    meta: {
      successMessage: (user: UserRead) => `Removed user ${user.first_name} ${user.last_name} from project`,
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
