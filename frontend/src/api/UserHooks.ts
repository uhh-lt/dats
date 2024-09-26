import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectRead } from "./openapi/models/ProjectRead.ts";
import { PublicUserRead } from "./openapi/models/PublicUserRead.ts";
import { AuthenticationService } from "./openapi/services/AuthenticationService.ts";
import { UserService } from "./openapi/services/UserService.ts";

// project
const useGetProjects = (userId: number | null | undefined) =>
  useQuery<ProjectRead[], Error>({
    queryKey: [QueryKey.USER_PROJECTS, userId],
    queryFn: () => UserService.getUserProjects({ userId: userId! }),
    enabled: !!userId,
  });

const useGetUser = (userId: number | null | undefined) =>
  useQuery<PublicUserRead, Error>({
    queryKey: [QueryKey.USER, userId],
    queryFn: () => UserService.getById({ userId: userId! }),
    enabled: !!userId,
  });

const useRegister = () =>
  useMutation({
    mutationFn: AuthenticationService.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USERS] });
    },
  });

const useGetAll = () =>
  useQuery<PublicUserRead[], Error>({ queryKey: [QueryKey.USERS], queryFn: () => UserService.getAll({}) });

const useGetRecentActivity = (userId: number | null | undefined, k: number) => {
  return useQuery<number[], Error>({
    queryKey: [QueryKey.USER_ACTIVITY, userId, k],
    queryFn: () => UserService.recentActivity({ userId: userId!, k: k }),
    enabled: !!userId,
  });
};

const useUpdate = () =>
  useMutation({
    mutationFn: UserService.updateById,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USERS] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER, user.id] });
    },
  });

const UserHooks = {
  useGetProjects,
  useGetUser,
  useGetAll,
  useRegister,
  useGetRecentActivity,
  useUpdate,
};

export default UserHooks;
